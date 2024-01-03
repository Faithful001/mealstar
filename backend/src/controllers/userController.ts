import jwtUtil from "../utils/jwt.util";
import { OTPMethods } from "../utils/otp.util";
import { sendOTPToEmail } from "../utils/sendemail.util";
import bcrypt from "bcryptjs";
const User = require("../models/userModel");
const OTP = require("../models/otpModel");

const loginUser = async (req, res) => {
	const { email, password } = req.body;
	try {
		const user = await User.login(email, password);
		const token = jwtUtil.createToken(user._id, "2d");
		res.status(200).json({ user, token });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

const signupUser = async (req, res) => {
	try {
		const { user_name, email, password } = req.body;
		const user = await User.signup(user_name, email, password);
		const token = jwtUtil.createToken(user._id, "2d");
		res.status(200).json({ user, token });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

const recoverAccount = async (req, res) => {
	try {
		const { email } = req.body;
		const userExists = await User.findOne({ email });
		if (!userExists) {
			return res
				.status(404)
				.json({ error: "User with this email does not exist" });
		}

		if (!userExists.password) {
			throw new Error(
				"You registered with Gmail. You are not eligible to reset your password"
			);
		}

		const user_id = userExists?._id;

		const OTPexists = await OTP.findOne({ user_id });
		// console.log("OTPexists:", OTPexists);
		// const otp_id = OTPexists._id;
		if (!OTPexists) {
			const hashedOTP = await sendOTPToEmail(email);
			console.log("hashedOTP:", hashedOTP);
			console.log("user_id:", user_id);

			const returnToClient = await OTPMethods.createOTPForServer(
				hashedOTP,
				user_id
			);

			const ThirthyMininutes = 120000;
			setTimeout(() => {
				OTPMethods.changeOTPStatusToExpired(OTPexists.user_id);
			}, ThirthyMininutes);

			console.log("otp_user_id", returnToClient?.user_id);

			return res
				.status(200)
				.json({ message: "otp sent successfully", returnToClient });
		} else {
			const hashedOTP = await sendOTPToEmail(email);
			console.log("hashedOTP:", hashedOTP);
			console.log("user_id:", user_id);
			const otpModel = await OTPMethods.updateOTPForServer(hashedOTP, user_id);
			// console.log("otp_user_id", otpModel?.user_id);
			const ThirthyMininutes = 120000;
			setTimeout(() => {
				OTPMethods.changeOTPStatusToExpired(OTPexists.user_id);
			}, ThirthyMininutes);

			res.status(200).json({ message: "otp sent successfully", otpModel });
		}
		// console.log("otpUser", otpUser);
	} catch (error: any) {
		console.error("something went wrong", error);

		res.status(500).json({ error: error.message });
	}
};

const verifyOTP = async (req, res) => {
	try {
		const { otp, otp_user_id } = req.body;
		console.log("otp inputed:", otp);

		const otpModel = await OTP.findOne({ otp_user_id });
		if (!otpModel) {
			return res.status(404).json({ error: "No OTP found for this user" });
		}

		if (otpModel.status === "expired") {
			return res.status(401).json({ error: "The otp has expired" });
		} else if (otpModel.status === "used") {
			return res.status(401).json({ error: "The otp has been used" });
		}
		// console.log("otpModel:", otpModel);
		const compareOTP = await bcrypt.compare(otp, otpModel.otp);
		console.log("compareOTP", typeof compareOTP);

		if (!compareOTP) {
			return res.status(401).json({ error: "Incorrect otp given" });
		}
		const user_id = otpModel.user_id;
		const user = await User.findById(user_id);
		const token = jwtUtil.createToken(user._id, "10m");

		const returnData = {
			user_name: user.user_name,
			email: user.email,
			createdAt: user.createdAt,
			updateAt: user.updatedAt,
		};

		res.status(200).json({
			message: "OTP authenticated. User authorized",
			returnData,
			token,
		});
	} catch (error) {
		res.status(500).json({ error: "an error occured" + error });
	}
};

const resetPassword = async (req, res) => {
	try {
		const { email, password } = req.body;
		if (!email || !password) {
			return res.status(400).json({ error: "All fields are required" });
		}

		const user = await User.findOne({ email });

		if (!user) {
			return res
				.status(404)
				.json({ error: "user with this email does not exist" });
		}

		const userId = req.userr._id;
		const otpModel = await OTP.findOne({ user_id: userId });

		if (!otpModel) {
			return res.status(404).json({ error: "No OTP found for this user" });
		}

		if (otpModel.status === "expired") {
			return res.status(401).json({ error: "The otp has expired" });
		} else if (otpModel.status === "used") {
			return res.status(401).json({ error: "The otp has been used" });
		}

		const comparePasswords = await bcrypt.compare(password, user.password);

		if (comparePasswords) {
			return res
				.status(400)
				.json({ error: "New password cannot be the same as the old password" });
		}
		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(password, salt);

		user.password = hashedPassword;

		await user.save();
		await OTPMethods.changeOTPStatusToUsed(otpModel.user_id);
		console.log("otpModel:", otpModel);

		const returnData = {
			user_name: user.user_name,
			email: user.email,
			createdAt: user.createdAt,
			updateAt: user.updatedAt,
		};

		res.status(200).json({ message: "password reset", returnData });
	} catch (error) {
		res.status(500).json({ error: "an error occured" + error });
	}
};

module.exports = {
	loginUser,
	signupUser,
	recoverAccount,
	verifyOTP,
	resetPassword,
};
