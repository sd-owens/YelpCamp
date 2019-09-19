const express = require("express");
const router = express.Router();
const Campground = require("../models/campground");
const middleware = require("../middleware");

let NodeGeocoder = require("node-geocoder");

let options = {
    provider: "google",
    httpAdapter: "https",
    apiKey: process.env.GEOCODER_API_KEY,
    formatter: null,
};

let geocoder = NodeGeocoder(options);

// INDEX ROUTE - show all campgrounds
router.get("/", (req, res) => {
    // RegEx variable
    let noMatch = null;
    // Pagination variables
    let perPage = 8;
    let pageQuery = parseInt(req.query.page);
    let pageNumber = pageQuery ? pageQuery : 1;
    if (req.query.search) {
        const regex = new RegExp(escapeRegex(req.query.search), "gi");
        Campground.find({ name: regex })
            .skip(perPage * pageNumber - perPage)
            .limit(perPage)
            .exec((err, allCampgrounds) => {
                if (err) {
                    console.log(err);
                }
                Campground.count().exec((err, count) => {
                    if (err) {
                        console.log(err);
                    } else {
                        if (allCampgrounds.length < 1) {
                            noMatch =
                                "No campgrounds match that query, please try again.";
                        }
                        res.render("campgrounds/index", {
                            campgrounds: allCampgrounds,
                            current: pageNumber,
                            pages: Math.ceil(count / perPage),
                            noMatch: noMatch,
                        });
                    }
                });
            });
    } else {
        // Get all campgrounds from dB
        Campground.find({})
            .skip(perPage * pageNumber - perPage)
            .limit(perPage)
            .exec((err, allCampgrounds) => {
                if (err) {
                    console.log(err);
                }
                Campground.count().exec((err, count) => {
                    if (err) {
                        console.log(err);
                    } else {
                        res.render("campgrounds/index", {
                            campgrounds: allCampgrounds,
                            current: pageNumber,
                            pages: Math.ceil(count / perPage),
                            noMatch: noMatch,
                        });
                    }
                });
            });
    }
});

//CREATE - add new campground to DB
router.post("/", middleware.isLoggedIn, function(req, res) {
    // get data from form and add to campgrounds array
    let name = req.body.name;
    let image = req.body.image;
    let price = req.body.price;
    let desc = req.body.description;
    let author = {
        id: req.user._id,
        username: req.user.username,
    };
    geocoder.geocode(req.body.location, function(err, data) {
        if (err || !data.length) {
            req.flash("error", "Invalid address");
            return res.redirect("back");
        }
        let lat = data[0].latitude;
        let lng = data[0].longitude;
        let location = data[0].formattedAddress;
        let newCampground = {
            name: name,
            image: image,
            price: price,
            description: desc,
            author: author,
            location: location,
            lat: lat,
            lng: lng,
        };
        // Create a new campground and save to DB
        Campground.create(newCampground, function(err, newlyCreated) {
            if (err) {
                console.log(err);
            } else {
                //redirect back to campgrounds page
                console.log(newlyCreated);
                res.redirect("/campgrounds");
            }
        });
    });
});

// NEW - show form to create new campground
router.get("/new", middleware.isLoggedIn, (req, res) => {
    res.render("campgrounds/new");
});

// SHOW - show info about one campground
router.get("/:id", (req, res) => {
    // find the campground with provided ID
    Campground.findById(req.params.id)
        .populate("comments likes")
        .exec((err, foundCampground) => {
            if (err) {
                req.flash("error", err.message);
                console.log(err);
            } else {
                res.render("campgrounds/show", { campground: foundCampground });
            }
        });
});

// EDIT CAMPGROUND ROUTE
router.get("/:id/edit", middleware.checkCampgroundOwnership, (req, res) => {
    Campground.findById(req.params.id, (err, foundCampground) => {
        if (err) {
            req.flash("error", "Campground not found!");
            res.redirect("back");
        } else {
            res.render("campgrounds/edit", { campground: foundCampground });
        }
    });
});

// UPDATE CAMPGROUND ROUTE
router.put("/:id", middleware.checkCampgroundOwnership, function(req, res) {
    geocoder.geocode(req.body.location, function(err, data) {
        if (err || !data.length) {
            req.flash("error", "Invalid address");
            console.log(err.message); // TODO
            return res.redirect("back");
        }
        req.body.campground.lat = data[0].latitude;
        req.body.campground.lng = data[0].longitude;
        req.body.campground.location = data[0].formattedAddress;

        Campground.findByIdAndUpdate(
            req.params.id,
            req.body.campground,
            function(err, campground) {
                if (err) {
                    req.flash("error", err.message);
                    res.redirect("back");
                } else {
                    req.flash("success", "Successfully Updated!");
                    res.redirect("/campgrounds/" + campground._id);
                }
            },
        );
    });
});

// DESTROY CAMPGROUND ROUTE
router.delete("/:id", middleware.checkCampgroundOwnership, (req, res) => {
    Campground.findByIdAndRemove(req.params.id, (err) => {
        if (err) {
            req.flash("error", err.message);
            res.redirect("/campgrounds");
        } else {
            res.redirect("/campgrounds");
        }
    });
});

// Campground Like Route
router.post("/:id/like", middleware.isLoggedIn, function(req, res) {
    Campground.findById(req.params.id, function(err, foundCampground) {
        if (err) {
            console.log(err);
            return res.redirect("/campgrounds");
        }

        // check if req.user._id exists in foundCampground.likes
        var foundUserLike = foundCampground.likes.some(function(like) {
            return like.equals(req.user._id);
        });

        if (foundUserLike) {
            // user already liked, removing like
            foundCampground.likes.pull(req.user._id);
        } else {
            // adding the new user like
            foundCampground.likes.push(req.user);
        }

        foundCampground.save(function(err) {
            if (err) {
                console.log(err);
                return res.redirect("/campgrounds");
            }
            return res.redirect("/campgrounds/" + foundCampground._id);
        });
    });
});

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

module.exports = router;
