package br.com.powercards.services;

import br.com.powercards.model.User;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.SetBucketPolicyArgs;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.InputStream;

@ApplicationScoped
public class ProfileService {

    private static final Logger LOGGER = LoggerFactory.getLogger(ProfileService.class);
    private static final String AVATAR_BUCKET = "user-avatars";
    private static final String BANNER_BUCKET = "user-banners";

    @Inject
    MinioClient minioClient;

    @ConfigProperty(name = "quarkus.minio.url")
    String minioUrl;

    @Transactional
    public User getOrCreateUser(String keycloakId) {
        return User.findOrCreate(keycloakId);
    }

    @Transactional
    public User updateProfile(String keycloakId, String displayName, String description) {
        User user = User.findOrCreate(keycloakId);
        if (displayName != null) {
            user.displayName = displayName;
        }
        if (description != null) {
            user.description = description;
        }
        return user;
    }

    @Transactional
    public User uploadAvatar(String keycloakId, InputStream fileStream, String filename, String contentType,
            long size) {
        try {
            createBucketIfNotExists(AVATAR_BUCKET);

            User user = User.findOrCreate(keycloakId);

            // Generate unique filename with user ID prefix
            String objectName = "avatar-" + user.id + "-" + System.currentTimeMillis() + getExtension(filename);

            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(AVATAR_BUCKET)
                            .object(objectName)
                            .stream(fileStream, size, -1)
                            .contentType(contentType)
                            .build());

            user.avatarUrl = minioUrl + "/" + AVATAR_BUCKET + "/" + objectName;
            LOGGER.info("Avatar uploaded for user {}: {}", keycloakId, user.avatarUrl);

            return user;
        } catch (Exception e) {
            LOGGER.error("Failed to upload avatar for user {}: {}", keycloakId, e.getMessage());
            throw new RuntimeException("Avatar upload failed", e);
        }
    }

    @Transactional
    public User uploadBanner(String keycloakId, InputStream fileStream, String filename, String contentType,
            long size) {
        try {
            createBucketIfNotExists(BANNER_BUCKET);

            User user = User.findOrCreate(keycloakId);

            // Generate unique filename with user ID prefix
            String objectName = "banner-" + user.id + "-" + System.currentTimeMillis() + getExtension(filename);

            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(BANNER_BUCKET)
                            .object(objectName)
                            .stream(fileStream, size, -1)
                            .contentType(contentType)
                            .build());

            user.bannerUrl = minioUrl + "/" + BANNER_BUCKET + "/" + objectName;
            LOGGER.info("Banner uploaded for user {}: {}", keycloakId, user.bannerUrl);

            return user;
        } catch (Exception e) {
            LOGGER.error("Failed to upload banner for user {}: {}", keycloakId, e.getMessage());
            throw new RuntimeException("Banner upload failed", e);
        }
    }

    private String getExtension(String filename) {
        if (filename == null)
            return ".png";
        int lastDot = filename.lastIndexOf('.');
        return lastDot > 0 ? filename.substring(lastDot) : ".png";
    }

    private void createBucketIfNotExists(String bucketName) {
        try {
            boolean found = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
            if (!found) {
                LOGGER.info("Creating bucket: {}", bucketName);
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());

                // Set public read-only policy
                String policy = """
                        {
                            "Version": "2012-10-17",
                            "Statement": [
                                {
                                    "Effect": "Allow",
                                    "Principal": "*",
                                    "Action": ["s3:GetObject"],
                                    "Resource": ["arn:aws:s3:::%s/*"]
                                }
                            ]
                        }
                        """.formatted(bucketName);
                minioClient.setBucketPolicy(
                        SetBucketPolicyArgs.builder().bucket(bucketName).config(policy).build());
                LOGGER.info("Public read-only policy applied to bucket: {}", bucketName);
            }
        } catch (Exception e) {
            LOGGER.error("Error initializing bucket {}: {}", bucketName, e.getMessage());
            throw new RuntimeException("Could not initialize bucket", e);
        }
    }
}
