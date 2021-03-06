/*     require packages    */
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const sanitizeHtml = require("sanitize-html");
const mongoose = require("mongoose");
const passport = require("passport");
const session = require("express-session");
const passportLocalMongoose = require("passport-local-mongoose");
const isAuthenticated = require("./auth");

/*   some const variables    */
const homeStartingContent = "Lacus vel facilisis volutpat est velit egestas dui id ornare. Semper auctor neque vitae tempus quam. Sit amet cursus sit amet dictum sit amet justo. Viverra tellus in hac habitasse. Imperdiet proin fermentum leo vel orci porta. Donec ultrices tincidunt arcu non sodales neque sodales ut. Mattis molestie a iaculis at erat pellentesque adipiscing. Magnis dis parturient montes nascetur ridiculus mus mauris vitae ultricies. Adipiscing elit ut aliquam purus sit amet luctus venenatis lectus. Ultrices vitae auctor eu augue ut lectus arcu bibendum at. Odio euismod lacinia at quis risus sed vulputate odio ut. Cursus mattis molestie a iaculis at erat pellentesque adipiscing.";
const aboutContent = "Hac habitasse platea dictumst vestibulum rhoncus est pellentesque. Dictumst vestibulum rhoncus est pellentesque elit ullamcorper. Non diam phasellus vestibulum lorem sed. Platea dictumst quisque sagittis purus sit. Egestas sed sed risus pretium quam vulputate dignissim suspendisse. Mauris in aliquam sem fringilla. Semper risus in hendrerit gravida rutrum quisque non tellus orci. Amet massa vitae tortor condimentum lacinia quis vel eros. Enim ut tellus elementum sagittis vitae. Mauris ultrices eros in cursus turpis massa tincidunt dui.";
const contactContent = "Scelerisque eleifend donec pretium vulputate sapien. Rhoncus urna neque viverra justo nec ultrices. Arcu dui vivamus arcu felis bibendum. Consectetur adipiscing elit duis tristique. Risus viverra adipiscing at in tellus integer feugiat. Sapien nec sagittis aliquam malesuada bibendum arcu vitae. Consequat interdum varius sit amet mattis. Iaculis nunc sed augue lacus. Interdum posuere lorem ipsum dolor sit amet consectetur adipiscing elit. Pulvinar elementum integer enim neque. Ultrices gravida dictum fusce ut placerat orci nulla. Mauris in aliquam sem fringilla ut morbi tincidunt. Tortor posuere ac ut consequat semper viverra nam libero.";
const limit = 5; // 5 posts per page


/* initialize or config packages  */
const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
require('dotenv').config();


/*  initialize session  */
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());


/*    database configuration    */
mongoose.connect(`mongodb+srv://admin-yluo:${process.env.MONGODB_PASSWORD}@cluster0.gj8aj.mongodb.net/blogDB`, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
mongoose.set("useCreateIndex", true);
const postSchema = new mongoose.Schema({
    title: {
        type: String,
        require: [true, "must have a post title"]
    },
    tags: [{type: mongoose.Schema.Types.ObjectId, ref: "Tag"}],

    content: String,
    author: {type: mongoose.Schema.Types.ObjectId, ref: "User"},

    create_at: {
        type: Date,
        default: Date.now
    },

    update_at: {
        type: Date,
        default: Date.now
    }

});

const tagSchema = new mongoose.Schema({
    name: String,
    description: String,
});

const userSchema = new mongoose.Schema({
    googleId: String,
    firstName: String,
    lastName: String,
    access: Number,  //0 is admin
});

userSchema.plugin(passportLocalMongoose);
const Post = mongoose.model("Post", postSchema);
const Tag = mongoose.model("Tag", tagSchema);
const User = mongoose.model("User", userSchema);


/*     default tags      */
const binaryTree = new Tag({
    name: "Tree",
    description: "Binary Tree is a special datastructure used for data storage purposes. A binary tree has a special condition that each node can have a maximum of two children. "
});

const binarySearch = new Tag({
    name: "Binary Search",
    description: "eliminate search space by half every time"
});

/* Get Google Strategy*/
passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});
var GoogleStrategy = require('passport-google-oauth20').Strategy;
passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/callback"
    },
    function (accessToken, refreshToken, profile, cb) {
        User.findOne({googleId: profile.id}, function (err, user) {
            if (err) return cb(err);
            if (!user) {
                const newUser = new User({
                    googleId: profile.id,
                    firstName: profile.name.familyName,
                    lastName: profile.name.givenName,
                    access: 1
                });
                newUser.save();
                return cb(err, user);
            }
            return cb(err, user);
        });
    }
));


/*    routers    */
app.get('/auth/google',
    passport.authenticate('google', {scope: ['profile']}));

app.get('/auth/google/callback',
    passport.authenticate('google', {failureRedirect: '/login'}),
    function (req, res) {
        res.redirect('/');
    });

app.get("/", function (req, res) {
    res.redirect("/page-1");
});


app.get("/login", function (req, res) {
    res.render("login");
});

app.get("/register", function (req, res) {
    res.render("register");
});

app.get("/page-:page", function (req, res) {
    const page = req.params.page;
    Post.countDocuments({}, function (err, count) {
        if (err) throw err;
        const maxPage = Math.ceil(count / limit);
        Post.find({}).skip((page - 1) * limit).limit(limit).populate('tags').exec(function (err, posts) {
            if (err) {
                throw err;
            } else {
                res.render("home", {
                    posts: posts,
                    homeStartingContent: homeStartingContent,
                    currentPage: page,
                    maxPage: maxPage,
                    user: req.user
                });
            }
        })
    })


});

app.get("/about", function (req, res) {
    res.render("about", {aboutContent: aboutContent, user: req.user});
});

app.get("/contact", function (req, res) {
    res.render("contact", {contactContent: contactContent, user: req.user});
});

app.get("/compose/user-:userID([a-z0-9]{10,})", isAuthenticated, function (req, res) {

    Tag.find({}, function (err, tags) {
        if (err) {
            throw err;
        } else if (tags.length == 0) {
            Tag.insertMany([binarySearch, binaryTree], function (err) {
                if (err) throw err;
            });
            res.redirect("/compose");
        } else {
            res.render("compose", {tags: tags, post: null, selected: null,
                user:req.user, userID:req.params.userID});
        }
    });


});

app.post("/compose/user-:userID([a-z0-9]{10,})", function (req, res) {
    const cleanText = sanitizeHtml(req.body.postContent, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'code'])
    });
    const selectedTags = req.body.tags;  //id
    const postID = req.body.postID;
    const userID = req.params.userID;
    // check if post exists
    Post.findOne({_id: postID}, function (err, post) {
        if (!post) {
            const post = new Post({
                title: req.body.postTitle,
                content: cleanText,
                author: userID,
                tags: selectedTags
            });
            post.save();
            res.redirect("/page-1"); // for sync
        } else {
            Post.update({_id: postID},
                {
                    title: req.body.postTitle,
                    content: cleanText,
                    tags: selectedTags,
                    update_at: Date.now()
                }, function (err) {
                    if (err) {
                        throw err;
                    }
                    res.redirect("/page-1");
                })
        }
    });

});

app.get("/posts/:postID", function (req, res) {
    const postID = req.params.postID;
    Post.findOne({_id: postID}).populate("tags").exec(function (err, post) {
        if (err) throw err;
        res.render("post", {post: post, user: req.user})
    })

});

app.get("/post/:postID/edit", function (req, res) {
    const postID = req.params.postID;

    Tag.find({}, function (err, tags) {
        Post.findOne({_id: postID}).populate("tags").exec(function (err, post) {
            const selected = [];
            post.tags.forEach(function (tag) {
                selected.push(String(tag._id)); // convert to string, to check if tag is selected
            });

            res.render("compose", {post: post, tags: tags, selected: selected, user: req.user});
        })
    })

});

app.get("/post/:postID/delete", function (req, res) {
    const postID = req.params.postID;
    Post.deleteOne({_id: postID}, function (err) {
        if (err) throw err;
        res.redirect("/page-1");
    })
});


app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/");
})

// app.get("/test/test", function (req, res) {
//   // find all posts with tag "Tree"

//   Tag.find({$or: [{name: "Tree"}, {name: "Binary Search"}]}, function (err, trees) {
//
//     Post.find({tags: }).populate("tags").exec(function(err, post){
//       console.log(post);
//     })
//   })
// });


let port = process.env.PORT;
if (port == null || port == "") {
    port = 3000;
}
app.listen(port);