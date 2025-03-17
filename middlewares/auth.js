const {getUser} = require('../../TEST PROJECT/service/auth.js');



async function restrictToLoggedinUserOnly(req, res, next) {
    console.log(req);
    const userUid = req.cookies?.uid;
  if (!userUid) {
    return res.redirect('/login');
    
    }
    const user = await getUser(userUid);
    if (!user) {
        return res.redirect('/login');
  }
  req.user = user;
  next();
    
}

module.exports = {
    restrictToLoggedinUserOnly,
};