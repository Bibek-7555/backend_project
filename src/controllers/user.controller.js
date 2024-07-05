import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import fs from 'fs'
import jwt from 'jsonwebtoken'
import mongoose from "mongoose";

const unlinkfile = (localpaths) => {
    localpaths.forEach((localpath) => {
        if(localpath){ 
            fs.unlinkSync(localpath)
            console.log("localpath deleted: ", localpath)
        }
    })
}

const generateAccessAndRefreshTokens = async (userId) => {
    try{
        const user = await User.findById(userId)
        const refreshToken = user.generateRefreshToken()
        const accessToken = user.generateAccessToken()

        /*user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false})*/

        return {accessToken, refreshToken}
    } catch(error) {
        throw new ApiError(500, "Something went wrong while generating acces or refresh token")
    }
}

const registerUser= asyncHandler( async (req, res) => {
     // get user details from frontend
     // validation
     //check if user already exists: using email since it is unique
     // check for images and avatar
     //upload them to cloudinary , check for avatar
     //create user object - create entry in db
     // remove password and refresh token field from response
     //ckeck if user is created
     // return response

    const { fullname, username, email, password } = req.body
    console.log("Fullname: ", fullname);
    console.log("Password: ", password)
    console.log("Email: ", email )
    console.log("Username: ", username)
    // console.log(req.body)

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    /*let avatarLocalPath
    if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
        avatarLocalPath = req.files.avatar[0].path;
    } */
    console.log(req.files)
    let coverImagePath; 
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImagePath = req.files.coverImage[0].path;
    }

    if([fullname, email, password, username].some((field) => field.trim() === "")) {
        unlinkfile([avatarLocalPath, coverImagePath])
        throw new ApiError(400,"All fields are required")
    }
    if(!email.includes("@")) {
        unlinkfile([avatarLocalPath, coverImagePath])
        throw new ApiError(400,"Don't seem like a email Id")
    }

    const existedUser=await User.findOne({
        $or: [{username}, {email}]
    })
    if(existedUser) {
        throw new ApiError(409, "User with this username or email already exists")
    };

    
    //do afterward console.log(req.files)

    if(!avatarLocalPath) {
        unlinkfile([coverImagePath])
        throw new ApiError(400, "Avatar file is required")
    }

    const isAvatarUploadedInCloudinary = await uploadOnCloudinary(avatarLocalPath)

    let coverImageURL

    if(coverImagePath)
    {
        const isCoverImageUploadedInCloudinary = await uploadOnCloudinary(coverImagePath);
        coverImageURL = isCoverImageUploadedInCloudinary.url
    }

    if(!isAvatarUploadedInCloudinary) throw new ApiError(500, "Sorry for the inconvenience, Can't upload ur avatar")

    const user = await User.create({
        fullname,
        avatar: isAvatarUploadedInCloudinary.url,
        coverImage: coverImageURL  || "" ,
        email,
        password,
        username: username.toLowerCase()
    })

    const isUserCreated = await User.findById(user._id).select("-password -refreshToken")

    if(!isUserCreated) {
        throw new ApiError(500, "Something went wrong while registering the user(you")
    }

    return res.status(201).json(
        new ApiResponse(200, isUserCreated, "User regiseterd successfully")
    )

})

const loginUser = asyncHandler( async (req, res) => {
    // data from req.body
    // take crendials like username or email
    //find the user
    //password check
    //access token or refresh token generate
    //send cookies

    const {email, username, password} = req.body
    console.log(email);
    console.log(username);
    console.log(password);

    if(!(username || email)) {
        throw new ApiError(400, "Username or email is required")
    }

    const user = await User.findOne({
        $or: [{email: email}, {username: username}]
    })

    console.log(user)

    if(!user) {
        throw new ApiError(400, "You are not registered")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid) {
        throw new ApiError(400, "Password Incorrect")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    user.refreshToken = refreshToken;
    await user.save({validateBeforeSave: false})

    const demoUser = user.toObject();
    console.log("Demouser")
    console.log(demoUser)
    delete demoUser.password;
    delete demoUser.refreshToken;
    console.log("Again demouser after update")
    console.log(demoUser)

    /*const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    console.log(loggedInUser)*/


    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: demoUser, accessToken, refreshToken
            },
            "User logged in Successfully"
        )
    )

})

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"))

})

const refreshAccessToken = asyncHandler(async (req,res) => {
    try {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    
        if(!incomingRefreshToken) {
            throw new ApiError(401,"Unauthorized Request")
        }
    
        const decodedToken =  jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user) {
            throw new ApiError(401,"Invalid Refresh Token")
        }
    
        if(incomingRefreshToken != user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {newRefreshToken, accessToken} = await generateAccessAndRefreshTokens(user._id)
        user.refreshToken = newRefreshToken;
        await user.save({validateBeforeSave: false})
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken, refreshToken: newRefreshToken
                },
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

const changeCurrentPassword = asyncHandler(async (req,res) => {

    const {oldPassword, newPassword} = req.body
    const user = await User.findById(req.user?._id)

    const isCorrectPassword = await user.isPasswordCorrect(oldPassword)

    if(!isCorrectPassword)
    {
        throw new ApiError(400, "Invalid Old Password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))

})

const getCurrentUser = asyncHandler( async(req,res) => {
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"))
})

const updateAccountDetails = asyncHandler(async(req,res) => {
    const {fullname, email} = req.body
    if (!(fullname && email)) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
})

const userAvatar = asyncHandler( async(req,res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath) {
        throw new ApiError(400, "Please upload avatar")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url) {
        throw new ApiError(400, "Error while uploading avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"))

})

const userCoverImage = asyncHandler( async(req,res) => {
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath) {
        throw new ApiError(400, "Please upload CoverImage")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url) {
        throw new ApiError(400, "Error while uploading coverimage")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Coverimage updated successfully"))

})

const getUserChannelProfile = asyncHandler( async(req, res) => {
    const {username} = req.params

    if(!username?.trim()) {
        throw new ApiError(400, "Username from params is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
                createdAt: 1
            }
        }
    ])
    if (!channel.length) {
        throw new ApiError(400, "Channel does not exist")
    }
    console.log(channel)
    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )
})

const getWatchHistory = asyncHandler(async(req, res)=> {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    console.log(user)

    return res
    .status(200)
    .json(
        new ApiResponse(200,
            user[0].watchHistory,
            "Watch history fetched successfully "
         )
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    userAvatar,
    userCoverImage,
    getUserChannelProfile,
    getWatchHistory
}