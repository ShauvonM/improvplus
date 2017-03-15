// DEPRECATED!
// this stuff has been migrated to Mongo - see user.controller.js

const connection  = require("../connection"),
    bcrypt      = require('bcrypt-nodejs'),
    auth        = require('../../auth'),
    roles       = require('../../roles'),
    formProperties = [
            "Email",
            "FirstName",
            "LastName",
            "Title",
            "Company",
            "Phone",
            "Address",
            "City",
            "State",
            "Zip",
            "Country",
            "ImprovExp",
            "FacilitationExp",
            "TrainingInterest",
            "URL",
            "Description"
        ];

exports.create = function(req,res) {
    var data = connection.getPostData(req.body, formProperties),
        Password = data.Password;

    data.DateAdded = 'NOW';
    data.DateModified = 'NOW';
    data.UserLevel = [1];
    
    bcrypt.hash(Password, null, null, function (hasherr, hash) {
        if (hasherr) {
            res.send('500', hasherr);
            return;
        }

        data.Password = hash;
        var q = connection.getInsertQuery('users', data, 'UserID');

        connection.query(q.query, q.values, function(err, result) {
            if (err) {
                res.json("500", err);
            } else {
                res.json("200", result.rows[0].UserID);
            }
        });
    });
};
exports.getAll = function(req,res) {
    connection.query("SELECT * FROM users;", function(err, result) {
        if (err) {
            res.json("500", err);
        } else {
            res.json("200", result.rows);
        }
    });
};
exports.get = function(req, res) {
    // (mysql) connection.query("SELECT * FROM users WHERE UserID="+req.params.id+";", function(err,rows,fields) {
    findUser(req.params.id, null, function (err, result) {
        if (err) {
            res.json("500", err);
        } else {
            res.json("200", result);
        }
    });
};
exports.update = function(req, res) {
    var formData = connection.getPostData(req.body, formProperties),
        password = req.body.Password,
        callback = function (hasherr, hash) {
            if (hasherr) {
                res.json('500', {message: 'Server Error', error: hasherr });
            }

            if (hash) {
                formData.Password = hash;
            } else {
                delete formData.Password;
            }
            formData.DateModified = 'NOW';
        
            var q = connection.getUpdateQuery('users', formData, { UserID: req.params.id });

            connection.query(q.query, q.values, function(err, response) {
                if (err) {
                    res.json('500', err);
                } else {
                    let user = response.rows[0],
                        roleId = user.RoleID;

                    // don't respond with the user's password
                    delete user.Password;

                    user.actions = roles.getActionsForRole(roleId);

                    res.json('200', user);
                }
            });
        };
    
    console.log('password?', password);
    if (password) {
        bcrypt.hash(password, null, null, callback);
    } else {
        callback(null, null);
    }
};
exports.delete = function(req, res) {
    connection.query('DELETE FROM users WHERE "UserID"=$1;', [req.params.id], function(err) {
        if (err) {
            res.json("500", err);
        } else {
            res.json("200", "User Deleted");
        }
    });
};

function findUser (UserID, Email, callback) {
    var q,
        p = [];
    
    // q  = 'SELECT "UserID", "FirstName", "LastName", "Gender", "Email", "URL", "DateAdded", "DateModified", "Password", "Description", ';
    // q += 'ARRAY(SELECT permissionkey."Name" FROM userlevel, permissionkey, permissionkeyuserlevel WHERE ';
    // q += 'userlevel."UserLevelID"= ANY(users."UserLevel") AND permissionkeyuserlevel."UserLevelID"=userlevel."UserLevelID" ';
    // q += 'AND permissionkey."PermissionKeyID" = permissionkeyuserlevel."PermissionKeyID") AS "Permissions" FROM users WHERE ';
    q = 'SELECT * FROM users WHERE ';
    
    if (UserID) {
        q += '"UserID"';
        p.push(UserID);
    } else if (Email) {
        q += '"Email"';
        p.push(Email);
    } else {
        callback('No UserID or Email were provided.');
        return;
    }
    q += '=$1;';

    connection.query(q, p, function (err, result) {
        if (err) {
            callback(err, null);
        } else {
            if (result.rows.length) {
                let user = result.rows[0],
                    roleId = user.RoleID;

                user.actions = roles.getActionsForRole(roleId);


                callback(null, user);
            } else {
                callback(null, false);
            }
        }
    });
}
exports.findUser = findUser;

function validateUser (email, password, callback) {
    findUser(null, email, function (err, user) {
        if (err) {
            callback(err, null);
        } else {
            if (user) {
                bcrypt.compare(password, user.Password, function (comperr, valid) {
                    if (comperr) {
                        callback(comperr, null);
                    } else if (valid) {
                        user.Password = "";
                        callback(null, user);
                    } else {
                        callback(null, false);
                    }
                });
            } else {
                callback(null, false);
            }
        }
    });
}
exports.validateUser = validateUser;