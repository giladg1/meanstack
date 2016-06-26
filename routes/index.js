var express = require('express');
var router = express.Router();

var jwt = require('express-jwt');

var mongoose = require('mongoose');
var Post = mongoose.model('Post');
var Comment = mongoose.model('Comment');
var passport = require('passport');
var User = mongoose.model('User');

// get all posts from our database (mongodb)
router.get('/posts', function(req, res, next) {
  Post.find(function(err, posts){
    if(err){ return next(err); }

    res.json(posts);
  });
});


/* The userPropery option specifies which property on req to put our payload from our tokens.
 By default it's set on user but we're using payload instead to avoid any conflicts with passport
 (it shouldn't be an issue since we aren't using both methods of authentication in the same request).
 This also avoids confusion since the payload isn't an instance of our User model.
 */
var auth = jwt({secret: 'SECRET', userProperty: 'payload'}); // Create a middleware for authenticating jwt tokens

// post a new post to the database (mongodb)
router.post('/posts', auth, function(req, res, next) {
  var post = new Post(req.body);
  post.author = req.payload.username; // this is taking from the cookie (localStorage) information on the user machine (auth variable)

  post.save(function(err, post){
    if(err){ return next(err); }

    res.json(post);
  });
});

router.param('post', function(req, res, next, id) {
  var query = Post.findById(id);

  query.exec(function (err, post){
    if (err) { return next(err); }
    if (!post) { return next(new Error('can\'t find post')); }

    req.post = post;
    return next();
  });
});

// request one post only by using the router param we write before
router.get('/posts/:post', function(req, res, next) {
  req.post.populate('comments', function(err, post) {
    if (err) { return next(err); }

    res.json(post);
  });
});

// vote (like) a post
router.put('/posts/:post/upvote', auth, function(req, res, next) {
  req.post.upvote(function(err, post){
    if (err) { return next(err); }

    res.json(post);
  });
});

// create comments route for a particular post
router.post('/posts/:post/comments', auth, function(req, res, next) {
  var comment = new Comment(req.body);
  comment.post = req.post;
  comment.author = req.payload.username; // this is taking from the cookie (localStorage) information on the user machine (auth variable)

  comment.save(function(err, comment){
    if(err){ return next(err); }

    req.post.comments.push(comment);
    req.post.save(function(err, post) {
      if(err){ return next(err); }

      res.json(comment);
    });
  });
});

router.param('comment', function(req, res, next, id) {
  var query = Comment.findById(id);

  query.exec(function (err, comment){
    if (err) { return next(err); }
    if (!comment) { return next(new Error('can\'t find post')); }

    req.comment = comment;
    return next();
  });
});

router.get('/posts/:post/comments/:comment', function(req, res) {
  res.json(req.comment);
});

// vote (like) a comment of a specific post
router.put('/posts/:post/comments/:comment/upvote', auth, function(req, res, next) {
  req.comment.upvote(function(err, comment){
    if (err) { return next(err); }

    res.json(comment);
  });
});


// register user
router.post('/register', function(req, res, next){
  if(!req.body.username || !req.body.password){
    return res.status(400).json({message: 'Please fill out all fields'});
  }

  var user = new User();

  user.username = req.body.username;

  user.setPassword(req.body.password)

  user.save(function (err){
    if(err){ return next(err); }

    return res.json({token: user.generateJWT()})
  });
});

// authenticates a user
router.post('/login', function(req, res, next){
  if(!req.body.username || !req.body.password){
    return res.status(400).json({message: 'Please fill out all fields'});
  }

  passport.authenticate('local', function(err, user, info){
    if(err){ return next(err); }

    if(user){
      return res.json({token: user.generateJWT()});
    } else {
      return res.status(401).json(info);
    }
  })(req, res, next);
});




/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;

