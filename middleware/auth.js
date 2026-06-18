function requireAdmin(req, res, next) {
    if (
        req.session &&
        req.session.admin &&
        typeof req.session.admin.username === 'string'
    ) {
        return next();
    }

    return res.status(401).json({
        ok: false,
        message: 'Unauthorized'
    });
}

module.exports = {
    requireAdmin
};