import { v2 as cloudinary } from 'cloudinary'
import fs from "fs"
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({ 
    cloud_name:     process.env.CLOUDINARY_CLOUNDNAME, 
    api_key: process.env.CLOUDINARY_APIKEY,         
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary=async (localFilePath)=>{
    try {
        if(!localFilePath) return null;

        const response=await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto",
        })
        
        console.log("File is uploaded successfully on cloudinary ",response.url)

        fs.unlinkSync(localFilePath)
        
        return response

    } catch (error) {
        console.error("Error uploading to Cloudinary:", error);

        // Attempt to delete the file if upload fails
        if (localFilePath && fs.existsSync(localFilePath)) {
            try {
                fs.unlinkSync(localFilePath);
            } catch (unlinkErr) {
                console.error("Failed to delete temp file:", unlinkErr);
            }
        }
        return null;
    }
}

const deleteFromCloudinary = async (fileUrl) => {
    if (!fileUrl) return;

    try {
        const parts = fileUrl.split("/");
        const publicIdWithExtension = parts[parts.length - 1];
        const publicId = publicIdWithExtension.split(".")[0];
        await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
        console.log("Successfully deleted from Cloudinary:", publicId);
    } catch (error) {
        console.error("Error deleting from Cloudinary:", error);
    }
};

    
export {uploadOnCloudinary,deleteFromCloudinary};