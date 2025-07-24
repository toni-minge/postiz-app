import {
    UploadPartCommand,
    S3Client,
    ListPartsCommand,
    CreateMultipartUploadCommand,
    CompleteMultipartUploadCommand,
    AbortMultipartUploadCommand,
    PutObjectCommand,
    ObjectCannedACL,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Request, Response } from 'express';
import * as crypto from 'crypto';
import * as path from 'path';

// Utility function to generate a random string
const makeId = (length: number) => {
    let text = '';
    const possible =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i += 1) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

const {
    AWS_REGION,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_S3_BUCKET,
    AWS_S3_BUCKET_URL,
    AWS_S3_ENDPOINT,
} = process.env;

const S3 = new S3Client({
    region: AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID!,
        secretAccessKey: AWS_SECRET_ACCESS_KEY!,
    },
    ...(AWS_S3_ENDPOINT && { endpoint: AWS_S3_ENDPOINT }),
});

// Function to generate a random string
function generateRandomString() {
    return crypto.randomBytes(16).toString('hex');
}

export default async function handleS3Upload(
    endpoint: string,
    req: Request,
    res: Response
) {
    switch (endpoint) {
        case 'create-multipart-upload':
            return createMultipartUpload(req, res);
        case 'prepare-upload-parts':
            return prepareUploadParts(req, res);
        case 'list-parts':
            return listParts(req, res);
        case 'complete-multipart-upload':
            return completeMultipartUpload(req, res);
        case 'abort-multipart-upload':
            return abortMultipartUpload(req, res);
        case 'sign-part':
            return signPart(req, res);
        default:
            return res.status(404).json({ error: 'Endpoint not found' });
    }
}

export async function simpleUpload(
    data: Buffer,
    originalFilename: string,
    contentType: string
) {
    const fileExtension = path.extname(originalFilename); // Extract extension
    const randomFilename = generateRandomString() + fileExtension; // Append extension

    const params = {
        Bucket: AWS_S3_BUCKET!,
        Key: randomFilename,
        Body: data,
        ContentType: contentType,
        ACL: ObjectCannedACL.public_read,
    };

    const command = new PutObjectCommand({ ...params });
    await S3.send(command);

    return AWS_S3_BUCKET_URL + '/' + randomFilename;
}

export async function createMultipartUpload(req: Request, res: Response) {
    const { file, fileHash, contentType } = req.body;
    const fileExtension = path.extname(file.name); // Extract extension
    const randomFilename = generateRandomString() + fileExtension; // Append extension

    try {
        const params = {
            Bucket: AWS_S3_BUCKET!,
            Key: `${randomFilename}`,
            ContentType: contentType,
            ACL: ObjectCannedACL.public_read,
            Metadata: {
                'x-amz-meta-file-hash': fileHash,
            },
        };

        const command = new CreateMultipartUploadCommand({ ...params });
        const response = await S3.send(command);
        return res.status(200).json({
            uploadId: response.UploadId,
            key: response.Key,
        });
    } catch (err) {
        console.log('Error', err);
        return res.status(500).json({ source: { status: 500 } });
    }
}

export async function prepareUploadParts(req: Request, res: Response) {
    const { partData } = req.body;

    const parts = partData.parts;

    const response = {
        presignedUrls: {},
    };

    for (const part of parts) {
        try {
            const params = {
                Bucket: AWS_S3_BUCKET!,
                Key: partData.key,
                PartNumber: part.number,
                UploadId: partData.uploadId,
            };
            const command = new UploadPartCommand({ ...params });
            const url = await getSignedUrl(S3, command, { expiresIn: 3600 });

            // @ts-ignore
            response.presignedUrls[part.number] = url;
        } catch (err) {
            console.log('Error', err);
            return res.status(500).json(err);
        }
    }

    return res.status(200).json(response);
}

export async function listParts(req: Request, res: Response) {
    const { key, uploadId } = req.body;

    try {
        const params = {
            Bucket: AWS_S3_BUCKET!,
            Key: key,
            UploadId: uploadId,
        };
        const command = new ListPartsCommand({ ...params });
        const response = await S3.send(command);

        return res.status(200).json(response['Parts']);
    } catch (err) {
        console.log('Error', err);
        return res.status(500).json(err);
    }
}

export async function completeMultipartUpload(req: Request, res: Response) {
    const { key, uploadId, parts } = req.body;

    try {
        const params = {
            Bucket: AWS_S3_BUCKET!,
            Key: key,
            UploadId: uploadId,
            MultipartUpload: { Parts: parts },
        };

        const command = new CompleteMultipartUploadCommand({
            Bucket: AWS_S3_BUCKET!,
            Key: key,
            UploadId: uploadId,
            MultipartUpload: { Parts: parts },
        });
        const response = await S3.send(command);
        response.Location =
            AWS_S3_BUCKET_URL +
            '/' +
            response?.Location?.split('/').at(-1);
        return response;
    } catch (err) {
        console.log('Error', err);
        return res.status(500).json(err);
    }
}

export async function abortMultipartUpload(req: Request, res: Response) {
    const { key, uploadId } = req.body;

    try {
        const params = {
            Bucket: AWS_S3_BUCKET!,
            Key: key,
            UploadId: uploadId,
        };
        const command = new AbortMultipartUploadCommand({ ...params });
        const response = await S3.send(command);

        return res.status(200).json(response);
    } catch (err) {
        console.log('Error', err);
        return res.status(500).json(err);
    }
}

export async function signPart(req: Request, res: Response) {
    const { key, uploadId } = req.body;
    const partNumber = parseInt(req.body.partNumber);

    const params = {
        Bucket: AWS_S3_BUCKET!,
        Key: key,
        PartNumber: partNumber,
        UploadId: uploadId,
        Expires: 3600,
    };

    const command = new UploadPartCommand({ ...params });
    const url = await getSignedUrl(S3, command, { expiresIn: 3600 });

    return res.status(200).json({
        url: url,
    });
}
