import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { ApiError } from "../utils/ApiError.js"
import fs from 'fs'

const getVideosfromDatabase = async (page, limit, query, sortBy, sortType, userId) => {
        const filter = {}

        if(!(query || userId)) {
            return null
        }
    
        if (query) {
            filter.$or = [
                {title: new RegExp(query, 'i')},
                {description: new RegExp(query, 'i')}
            ]
        }
        
        if(userId) {
            filter.owner = userId
        }
    
        const sort = {}
    
        sort[sortBy] = sortType.toLowerCase() === 'desc' ? -1 : 1
    
        const options = {
            page: Number(page),
            limit: Number(limit),
            sort: sort
        }
        const resultOfVideos = await Video.paginate(filter, options)
    
        return {
            videos: resultOfVideos.docs,
            totalItems: resultOfVideos.totalDocs,
            totalPages: resultOfVideos.totalPages,
            currentPage: resultOfVideos.page,
            limit: resultOfVideos.limit,
        }
}


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    try {
        const videos = await getVideosfromDatabase(page, limit, query, sortBy, sortType, userId)
    
        return res
        .status(200)
        .json(new ApiResponse(200, videos, "Videos fetched Successfully"))
    } catch (error) {
        throw new ApiError(500, "Can't fetch videos successfully")
    }
    
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
    const videoLocalPath = req.files?.videoFile?.[0]?.path
    const thumbnailPath = req.files?.thumbnail?.[0]?.path

    if([title,description].some((field) => field.trim() === "")) {
        fs.unlinkSync(videoLocalPath)
        fs.unlinkSync(thumbnailPath)
    }

    if(!(videoLocalPath && thumbnailPath)) {
        throw new ApiError(400, "Please upload video as well as thumnail")
    }
    const videoUpload = await uploadOnCloudinary(videoLocalPath)
    const thumbnailUpload = await uploadOnCloudinary(thumbnailPath)

    if(!(videoUpload.url && thumbnailUpload.url)) {
        throw new ApiError(500, "Error while uploading video")
    }

    const video = await Video.create({
        title,
        description,
        videoFile: videoUpload.url,
        thumbnail: thumbnailUpload.url
    })

    const isVideoCreated = await Video.findById(video._id)
    return res
    .status(201)
    .json(new ApiResponse(200, isVideoCreated, "Video uploaded to database successfully"))
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    const {title, description } = req.body
    const thumbnailLocalPath = req.file?.thumbnail?.[0]?.path

    const uploadThumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if(!(title || description || thumbnailLocalPath)) {
        throw new ApiError(400, "Please atleast update one field which you want to update")
    }

    const updateField = {} 
    if(title) {
        updateField.title = title
    }

    if(description) {
        updateField.description = description
    }

    if(thumbnailLocalPath) {
        updateField.thumbnail = uploadThumbnail.url
    }



    const findVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {updateField}
        },
        {new: true}
    )

    if(!findVideo) {
        throw new ApiError(500, "Can't find the video in the database")
    }

    return res
    .status(201)
    .json(new ApiError(200, findVideo, "Video updated Successfully"))

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    try {
        const deleteResult = await Video.deleteOne({_id: videoId})
    
        if(deleteResult.deletedCount === 0) {
            res
            .status(404)
            .json({message: "Video not found to be deleted"})
        }
    
        return res
        .json({message: "deleted Successfully"})
    } catch (error) {
        res
        .status(500)
        .json({message: error.message})
    }
    //TODO: delete video
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const video = Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !isPublished
            }
        }
    )
    if (!video) {
        return res
        .status(404)
        .ApiError(404, "Video can't be found from database")
    }

    return res
    .status(201)
    .json(new ApiResponse(200, video, "Publish status updated successfully"))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
