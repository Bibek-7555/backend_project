import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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


    if([fullname, email, password, username].some((field) => field.trim() === "")) {
        throw new ApiError(400,"All fields are required")
    }
    if(!email.includes("@")) {
        throw new ApiError(400,"Don't seem like a email Id")
    }

    const existedUser=await User.findOne({
        $or: [{username}, {email}]
    })
    if(existedUser) {
        throw new ApiError(409, "User with this username or email already exists")
    };

    const avatarLocalPath = req.files?.avatar[0]?.path;
    let coverImagePath; 
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImagePath = req.files.coverImage[0].path;
    }
    //do afterward console.log(req.files)

    if(!avatarLocalPath) {
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

export {registerUser}