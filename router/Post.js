const router = require("express").Router();
const Post = require("../model/Post");
const verifyToken = require("../router/verifyToken")

router.post("/new/post",  verifyToken, async(req, res) => {
    const {title, image} = req.body;
    try {
    const post = await Post.create({
        title:title,
        image:image,
        user:req.user.id
    })
    console.log( post );
    res.status(200).json(post)
} catch (error) {
        return res.status(500).json("Internal Server Error!")
}
})

router.post("/all/post/by/user",  verifyToken, async(req, res) => {
    try {
    const post = await Post.find({user: req.user.id})
    if(!post){
        return res.status(404).json("You don't have any post")
    }
   return res.status(200).json(post)
} catch (error) {
        return res.status(500).json("Internal Server Error!")
}
})

//basically to add or remove a user id from a post when they like or unlike the post
router.put("/:id/like", verifyToken, async (req, res)=> {
    try {
        const post = await Post.findById(req.params.id)
        if(!post.likes.includes(req.user.id)){  //if user id is not include in the post like
            await post.updateOne({$push : {likes:req.user.id}})
        }else{
            await post.updateOne({$pull: {likes: req.user.id}})
        }
        return res.status(200).json("Like")
    } catch (err) {
        console.log(err);
    }
})

router.put("/comment/post", verifyToken, async (req, res)=> {
    try {
        const {comment, postid, profile} = req.body;
        const comments = {
            user: req.user.id,
            username: req.user.username,
            profile,
            comment
        }
        const post = await Post.findById(postid)
        post.comments.push(comments);
        await post.save();
        return res.status(200).json(post)
    } catch (err) {
        return res.status(500).json("Server error")
    }
})

module.exports =router