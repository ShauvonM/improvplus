var jwt = require('jwt-simple'),
    userApi = require('./routes/api/user'),
    roles = require('./roles'),
    config  = require('./config')(),
    url = require('url');
    //redis   = require('redis'),
    //client;

/*
if (config.redis.url) {
    var redisUrl = url.parse(config.redis.url);
    client = redis.createClient(redisUrl.port, redisUrl.hostname, {no_ready_check: true});
    client.auth(redisUrl.auth.split(':')[1]);
} else {
    client = redis.createClient(config.redis.port, config.redis.host);
}
*/

exports.login = function(req, res) {
    var email = req.body.email || '';
    var password = req.body.password || '';

    if (email === '' || password === '') {
        res.status(401).json({
            "status": 401,
            "message": "Invalid credentials"
        });
        return;
    }

    // Fire a query to your DB and check if the credentials are valid
    userApi.validateUser(email, password, function (err, user) {
        if (err) {
            res.status(500).json({ 'message': 'Server error', 'error': err });
        } else {
            if (user) {
                genToken(user, function (err, token) {
                    if (err) {
                        console.error('REDIS ERROR', err);
                    }
                    res.status(200).json(token);
                });
            } else {
                res.status(401).json({
                    "status": 401,
                    "message": "Invalid credentials"
                });
            }
        }
    });
};

exports.logout = function (req, res) {
    var token = (req.body && req.body.access_token) || (req.query && req.query.access_token) || req.headers['x-access-token'];
/*
    if (token) {
        // instantly expire the token from redis
        client.expire(token, 0, function (err, response) {
            if (err) {
                res.status(500).json({ message: 'Server Error', error: err });
            } else if (response) {
                console.log('USER LOG OUT');
                res.status(200).json({ message: 'Logout' });
            }
        });
    }
    */
    res.status(200).json({ message: 'Logout' });
};

exports.refresh = function (req, res) {
    var token = (req.body && req.body.access_token) || (req.query && req.query.access_token) || req.headers['x-access-token'];

    if (!token || !req.user) {
        res.status(401).json({
            'status': 401,
            'message': 'Invalid Token'
        });
        return;
    }

    /*
    // instantly expire the old token from redis
    client.expire(token, 0, function (err, response) {
        if (err) {
            res.status(500).json({ message: 'Server Error', error: err });
        } else if (response) {
            genToken(req.user, function (err, token) {
                if (err) {
                    console.error('REDIS ERROR', err);
                }
                res.status(200).json(token);
            });
        }
    });
    */

    genToken(req.user, function (err, token) {
        if (err) {
            console.error('REDIS ERROR', err);
        }
        res.status(200).json(token);
    });
};

function genToken(user, callback) {
    var expires = expiresIn(7), // one week, as recommended by Auth0
        token = jwt.encode({
            exp: expires,
            iss: user.UserID
        }, config.token);

        // this is all redis stuff, which isn't really necessary
        //multi = client.multi();

    //multi.set(token, user.UserID);
    //multi.expire(token, 60 * 60 * 24 * 7); // one week in seconds

    /*
    multi.exec(function (err) {
        callback(err, {
            token: token,
            expires: expires,
            user: user
        });
    });
    */

    callback(null, {
        token: token,
        expires: expires,
        user: user
    })
}

function expiresIn(days) {
    var dateObj = new Date();
    return dateObj.setDate(dateObj.getDate() + days);
}

/**
 * Load the supplied token, and use it to fetch the user requesting this action
 */
exports.checkToken = function (req, res, next) {
    var token = (req.body && req.body.access_token) ||
        (req.query && req.query.access_token) || req.headers['x-access-token'];

    req.user = false;
    if (token) {
        try {
            var decoded = jwt.decode(token, config.token);

            // first make sure the token hasn't expired
            if (decoded.exp > Date.now()) {
                // now make sure the user exists
                // The iss parameter would be the logged in user's UserID
                userApi.findUser(decoded.iss, null, function (err, user) {
                    if (user) {
                        /*
                        // now make sure the token exists
                        client.get(token, function (err, response) {
                            // the stored ID should be the supplied User ID
                            if (response && response === user.UserID) {
                                req.user = user;
                            }
                            next();
                        });
                        */
                        req.user = user;
                    }
                    next();
                });
            } else {
                next();
            }
        } catch (err) {
            console.log("Token decode error: ", err);
            next();
        }
    } else {
        req.user = {
            actions: roles.getActionsForRole(0)
        }
        next();
    }
};

function unauthorized (req, res) {
    res.status(401).json({
        "message": "Unauthorized"
    });
}
exports.unauthorized = unauthorized;

// hasPermission = function (user, key) {
//     if (!key) {
//         return true;
//     }
//     var perms = user.actions;
//     if (!perms) {
//         return false;
//     }
//     return perms.indexOf(key) > -1;
// };
// exports.hasPermission = hasPermission;

/**
 * Check the user's list of actions to see if they can do what they're trying to do
 */
exports.checkAuth = function (req, res, next) {
    console.log("Checking auth for: " + req.url);
    const url = req.url;

    let perm = roles.canUserHave(url, req.method, req.user);
    //     perm = true;

    // if (typeof(action) === 'function') {
    //     console.log('Action for ' + req.method + ':' + url + ' is a function');
    //     perm = action(url, req.method, req.user);
    // } else if (action) {
    //     console.log('Action for ' + req.method + ':' + url + ' is ' + action);
    //     perm = roles.doesUserHaveAction(req.user, action);
    // }

    if (!perm) {
        console.log('Auth not permitted!');
        unauthorized(req, res);
    } else {
        next();
    }
}
