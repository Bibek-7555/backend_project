import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs'

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View Credentials' below to copy your API secret
});

const uploadOnCloudinary = async (localfilepath) => {
    try {
        if(!localfilepath) {
            console.log("CaN't FiNd LoCaL fIlE pAtH")
            return null
        }
        const response = await cloudinary.uploader
       .upload(localfilepath
           , {
               resource_type: 'auto',
           }
       )// file has been uploaded successfully
       console.log("File has been uploaded successfully", response.url)
       return response;
    
    } catch (error) {
        fs.unlinkSync(localfilepath)
        //remove the lovally saved file
        return null
    }
}

export {uploadOnCloudinary}