import { Router } from "express";
import { changeCurrentPassword,
         getCurrentUser,
         getUserChannelProfile,
         getWatchHistory,
         loginUser,
         logoutUser, 
         refreshAccessToken, 
         registerUser, 
         updateAccountDetails, 
         userAvatar, 
         userCoverImage 
        } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router
.route("/register")
.post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)

router
.route("/login")
.post(loginUser)

//secyres routes
router
.route("/logout")
.post( verifyJWT, logoutUser)
router
.route("/refresh-Token")
.post(refreshAccessToken)

router
.route("/change-password")
.post(verifyJWT, changeCurrentPassword)

router
.route("/current-user")
.get(verifyJWT, getCurrentUser)

router
.route("/update-account")
.patch(verifyJWT, updateAccountDetails)

router
.route("/changeAvatar")
.patch(
    verifyJWT,
    upload.single("avatar"),
    userAvatar
)

router
.route("/change-coverImage")
.patch(
    verifyJWT,
    upload.single("coverImage"),
    userCoverImage
)

router
.route("/c/:username")
.get(verifyJWT, getUserChannelProfile)

router
.route("/watch_History")
.get(verifyJWT, getWatchHistory)

export default router