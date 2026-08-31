const s3RequestPresigned = require("@aws-sdk/s3-request-presigner");
const clientS3 = require("@aws-sdk/client-s3");

const mimeDB = require('mime-db');

const S3 = new clientS3.S3Client({});

/**
 * @param { string } path
 * @param { string } contentType
 * @param { string } user_sub
 */
const getPresignedUrl = async (path, contentType, user_sub) => {

  const presignedUrl = await s3RequestPresigned.getSignedUrl(
      S3,
      new clientS3.PutObjectCommand({ 
        Bucket: process.env.BUCKET_NAME, 
        Key: path,
        ContentType: contentType,
        Metadata: {
          "user_sub": user_sub
        }
      }),
      { expiresIn: 60 * 5 }
  );

  return presignedUrl;
}

exports.getPresignedUrl = getPresignedUrl;
exports.mimeDB = mimeDB;