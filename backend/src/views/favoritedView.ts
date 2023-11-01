import express from "express";
import passport from "passport";
const {
	addToFavorites,
	getFavorites,
	getFavorite,
	deleteFavorite,
} = require("../controllers/favoritedController");

const requireAuth = require("../middlewares/requireAuth");

const router = express.Router();

router.use(requireAuth);

router.post(
	"/",
	passport.authenticate("jwt", { session: false }),
	addToFavorites
);
router.get("/", passport.authenticate("jwt", { session: false }), getFavorites);
router.get(
	"/:id",
	passport.authenticate("jwt", { session: false }),
	getFavorite
);
router.delete(
	"/:id",
	passport.authenticate("jwt", { session: false }),
	deleteFavorite
);

module.exports = router;
