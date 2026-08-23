"""
Authentication/authorization helpers.

Previously, this system had a login endpoint that issued a fake, guessable
"token" (f'ff-token-{user_id}') that no route ever actually checked, and a
/me endpoint that hardcoded 'admin' regardless of any credential. Every API
route - employee records, payroll, biometric face data - was reachable by
anyone with the URL, with no login required. This module fixes that.

We use Flask's signed session cookie (itsdangerous under the hood) rather
than the old fake bearer token: it's what Flask already provides out of the
box, it's cryptographically signed against SECRET_KEY (so it can't be forged
or altered client-side), and it works transparently with the SPA's fetch
calls as long as `credentials: 'include'` is set (see frontend/static/js/api.js).
"""
from functools import wraps
from flask import session, jsonify


def login_required(view_func):
    @wraps(view_func)
    def wrapped(*args, **kwargs):
        if not session.get('user_id'):
            return jsonify({'error': 'Authentication required'}), 401
        return view_func(*args, **kwargs)
    return wrapped


def role_required(*roles):
    """Restrict a view to specific roles. Admins implicitly pass every check."""
    def decorator(view_func):
        @wraps(view_func)
        def wrapped(*args, **kwargs):
            if not session.get('user_id'):
                return jsonify({'error': 'Authentication required'}), 401
            user_role = session.get('role')
            if user_role != 'admin' and user_role not in roles:
                return jsonify({'error': 'Insufficient permissions'}), 403
            return view_func(*args, **kwargs)
        return wrapped
    return decorator
