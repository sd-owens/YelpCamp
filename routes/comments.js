const express = require("express");
const router = express.Router({ mergeParams: true });
const Campground = require("../models/campground");
const Comment = require("../models/comment");
const middleware = require("../middleware");

// COMMENT NEW ROUTE
router.get("/new", middleware.isLoggedIn, (req, res) => {
	Campground.findById(req.params.id, (err, campground) => {
		if (err) {
			console.log(err);
		} else {
			res.render("comments/new", { campground: campground });
		}
	});
});

// COMMENT CREATE ROUTE
router.post("/", middleware.isLoggedIn, (req, res) => {
	Campground.findById(req.params.id, (err, campground) => {
		if (err) {
			req.flash("error", err.message);
			console.log(err);
			res.redirect("/campgrounds");
		} else {
			Comment.create(req.body.comment, (err, comment) => {
				if (err) {
					req.flash("error", "Something went wrong!");
					console.log(err);
				} else {
					// add username and id to comment
					comment.author.id = req.user._id;
					comment.author.username = req.user.username;
					// save comment
					comment.save();
					campground.comments.push(comment);
					campground.save();
					req.flash("success", "Successfully added comment.");
					res.redirect("/campgrounds/" + campground._id);
				}
			});
		}
	});
});
// COMMENT EDIT ROUTE
router.get(
	"/:comment_id/edit",
	middleware.checkCommentOwnership,
	(req, res) => {
		Comment.findById(req.params.comment_id, (err, foundComment) => {
			if (err) {
				req.flash("error", err.message);
				res.redirect("back");
			} else {
				res.render("comments/edit", {
					campground_id: req.params.id,
					comment: foundComment
				});
			}
		});
	}
);

// COMMENT UPDATE ROUTE
router.put("/:comment_id/", middleware.checkCommentOwnership, (req, res) => {
	Comment.findByIdAndUpdate(
		req.params.comment_id,
		req.body.comment,
		(err, updatedComment) => {
			if (err) {
				req.flash("error", err.message);
				res.redirect("back");
			} else {
				res.redirect("/campgrounds/" + req.params.id);
			}
		}
	);
});

// COMMENT DESTROY ROUTE
router.delete("/:comment_id", middleware.checkCommentOwnership, (req, res) => {
	// find by id and remove
	Comment.findByIdAndRemove(req.params.comment_id, err => {
		if (err) {
			req.flash("error", err.message);
			res.redirect("back");
		} else {
			req.flash("success", "Comment deleted.");
			res.redirect("/campgrounds/" + req.params.id);
		}
	});
});

module.exports = router;
