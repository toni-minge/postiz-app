import { S3Client, PutObjectCommand, DeleteObjectCommand, ObjectCannedACL } from '@aws-sdk/client-s3';
import 'multer';
import * as mime from 'mime-types';
// @ts-ignore
import { getExtension } from 'mime';
import { IUploadProvider } from './upload.interface';

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

class S3Storage implements IUploadProvider {
    private _client: S3Client;

    constructor(
        private region: string,
        private accessKeyId: string,
        private secretAccessKey: string,
        private _bucketName: string,
        private _uploadUrl: string,
        private endpoint?: string
    ) {
        this._client = new S3Client({
            region: this.region,
            credentials: {
                accessKeyId: this.accessKeyId,
                secretAccessKey: this.secretAccessKey,
            },
            ...(endpoint && { endpoint }),
        });
    }

    async uploadSimple(path: string): Promise<string> {
        const loadImage = await fetch(path);
        const contentType =
            loadImage?.headers?.get('content-type') ||
            loadImage?.headers?.get('Content-Type');
        const extension = getExtension(contentType)!;
        const id = makeId(10);

        const params = {
            Bucket: this._bucketName,
            Key: `${id}.${extension}`,
            Body: Buffer.from(await loadImage.arrayBuffer()),
            ContentType: contentType,
            ACL: ObjectCannedACL.public_read,
        };

        const command = new PutObjectCommand({ ...params });
        await this._client.send(command);

        return `${this._uploadUrl}/${id}.${extension}`;
    }

    async uploadFile(file: Express.Multer.File): Promise<any> {
        const id = makeId(10);
        const extension = mime.extension(file.mimetype) || '';

        // Create the PutObjectCommand to upload the file to S3
        const command = new PutObjectCommand({
            Bucket: this._bucketName,
            ACL: ObjectCannedACL.public_read,
            Key: `${id}.${extension}`,
            Body: file.buffer,
            ContentType: file.mimetype,
        });

        await this._client.send(command);

        return {
            filename: `${id}.${extension}`,
            mimetype: file.mimetype,
            size: file.size,
            buffer: file.buffer,
            originalname: `${id}.${extension}`,
            fieldname: 'file',
            path: `${this._uploadUrl}/${id}.${extension}`,
            destination: `${this._uploadUrl}/${id}.${extension}`,
            encoding: '7bit',
            stream: file.buffer as any,
        };
    }

    async removeFile(filePath: string): Promise<void> {
        const fileName = filePath.split('/').pop(); // Extract the filename from the path
        if (fileName) {
            const command = new DeleteObjectCommand({
                Bucket: this._bucketName,
                Key: fileName,
            });
            await this._client.send(command);
        }
    }
}

export { S3Storage };
export default S3Storage;
