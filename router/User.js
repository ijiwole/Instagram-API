const router = require("express").Router()
const User = require("../model/User");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const dotenv = require("dotenv");
dotenv.config();
const jwt = require("jsonwebtoken");
const verifyToken = require("./verifyToken");

router.post("/new/user", async(req, res) => {
    try {
        const {email, password, username, profile} = req.body;

        let user = await User.findOne({email : req.body.email});
        if(user){
            return res.status(200).json('Login with correct password')
        }else{
            const salt = bcrypt.genSaltSync(saltRounds);
            const hash = bcrypt.hashSync(password, salt);
             user = await User.create({email:email, password:hash, username:username, profile:profile});
             const accessToken = jwt.sign({
                id : user._id,
                usernmame: user.username,
             },process.env.JWT_SECRET)
           return  res.status(200).json({ user, accessToken });
        }
        
    } catch (err) {
       return res.status(400).json({msg:'Internal Server Error'})
    }

})

router.post("/login", async(req, res) => {
    try {
        let user = await User.findOne({email : req.body.email});
        if(user){
            const comparepassword = await bcrypt.compare(req.body.password, user.password);
            if(!comparepassword){
                return res.status(400).json("Password Incorrect")
            }
             const accessToken = jwt.sign({
                id : user._id,
                usernmame: user.username,
             },process.env.JWT_SECRET);
            
             const {password, ...others} = user._doc;
           return  res.status(200).json({others, accessToken });
        }
        
    } catch (err) {
       return res.status(400).json({msg:'Internal Server Error'})
    }

})

//Logic to follow and unfollow a user
    router.put("/:id/follow", verifyToken, async(req, res)=>{
        
            if(req.params.id !== req.body.user){
                const user = await User.findById(req.params.id);
                console.log(user);
                const otherUser = await User.findById(req.body.user)
                console.log(otherUser);
        
                if(!user.followers.includes(req.body.user)){
                    await  User.updateOne({$push: {followings: req.body.user}})
                    await otherUser.updateOne({$push: {followers: req.params.id}})
                    return res.status(200).json("User has follow")
                }else{
                    await  User.updateOne({$pull: {followings: req.body.user}})
                    await otherUser.updateOne({$pull: {followers: req.params.id}})
                    return res.status(200).json("User has unfollow")
                }
            }
        
           return res.status(500).json("Server error")
    })

    //Agorithm to rank posts based on likes and comments

    router.get("/flw/:id", async(req, res)=> {
            const user = await User.findById(req.params.id);
            console.log(user);
            // rretrieve post from users and their follwers
            const followersPost = await Promise.all(
                user.followings.map((item)=> {
                    return Post.find({user: item})
                })
            )
            // retrieving post from the original user
            const userPost = await User.findById({ user: user._id});
            console.log(userPost);
            // concatenate post from user and their followers
            const filterProduct = userPost.concat(...followersPost);
                //calculate weight for each post using age, like and comment
            filterProduct.forEach((post)=> {
                const postAge = new Date (post.createdAt)
                const ageWeight = 1 - postAge/(1000*60*60*24); //weight decrease as post getting older
                const likeWeight = post.likes.length/100;
                const commentsWeight = post.comments.length/100;
                post.weight = ageWeight + likeWeight + commentsWeight
            })
            //sort post by their weight in descending order
            filterProduct.sort(a,b => b.weight - a.weight);
            return res.status(200).json(filterProduct)
            
        
   })

   //get a user for follw
router.get("/all/user/:id", verifyToken, async (req, res) => {
    try {
        const allUser = await User.find();
        const user = await User.findById(req.params.id);
        const followingUser = await Promise.all(
            user.followings.map((item)=>{
                return item;
            })
        ) 
        let userToFollow = allUser.filter((val)=>{
            return !followingUser.find((item)=>{
                return val._id.toString() === item;
            })
        })

        let fitlerUser = await Promise.all(
            userToFollow.map((item)=>{
              const {email, followers, followings, password, ...others} = item._doc;
                return others
            })
        )
        res.status(200).json(fitlerUser)
    } catch (err) {
        
    }
   })

router.put("/update/password/:id", verifyToken, async(req, res)=>{
    try {
        const user = await User.findById(req.params.id);
        if(!user){
            return res.status(404).json("User Not Found");
        }
        const isPasswordMatch = await bcrypt.compare(req.body.oldpassword, user.password);
        if(!isPasswordMatch){
            return res.status(400).json("Old Password does not match");
        }
        if(req.body.newPassword !== confirmPassword){
            return res.status(400).json("Password does not Match");
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.newPassword, salt);
        await User.save();
        return res.status(200).json("Your Password is Updated")
    } catch (error) {
       return res.status(500).json("server Error")
    }
   })
   
   router.get("/get/search/user", verifyToken, async(req, res)=> {
    try {
        const keyword = req.query.search
        ?{
            $or:[
                {username:{regex:req.query.search, $option: "i"}},
                {email:{regex:req.query.search, $option: "i"}},
            ]
        } : ""
        const users = await User.find(keyword).find({_id:{$ne:req.user.id}})
        return res.status(200).json(users)
    } catch (error) {
        return res.status(500).json("Server Error")
    }
   })

   //Explore Post
   router.get("/explore", verifyToken, async(req, res)=> {
    try {
        const userPost = await Post.find();

        userPost.forEach((post)=> {
            const postAge = new Date (post.createdAt)
                const ageWeight = 1 - postAge/(1000*60*60*24); //weight decrease as post getting older
                const likeWeight = post.likes.length/100;
                const commentsWeight = post.comments.length/100;
                post.weight = ageWeight + likeWeight + commentsWeight;
        })
        userPost.sort((a,b)=> b.weight - a.weight);
        return res.status(200).json(userPost)
    } catch (error) {
        return res.status(500).json("Server Error")
    }
   })

module.exports = router;