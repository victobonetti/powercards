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
    private static final String BUCKET_NAME = "user-avatars";

    @Inject
    MinioClient minioClient;

    @ConfigProperty(name = "quarkus.minio.url")
    String minioUrl;

    @Transactional
    public User getOrCreateUser(String keycloakId) {
        return User.findOrCreate(keycloakId);
    }

    @Transactional
    public User updateProfile(String keycloakId, String displayName) {
        User user = User.findOrCreate(keycloakId);
        user.displayName = displayName;
        return user;
    }

    @Transactional
    public User uploadAvatar(String keycloakId, InputStream fileStream, String filename, String contentType,
            long size) {
        try {
            createBucketIfNotExists();

            User user = User.findOrCreate(keycloakId);

            // Generate unique filename with user ID prefix
            String objectName = "avatar-" + user.id + "-" + System.currentTimeMillis() + getExtension(filename);

            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(BUCKET_NAME)
                            .object(objectName)
                            .stream(fileStream, size, -1)
                            .contentType(contentType)
                            .build());

            user.avatarUrl = minioUrl + "/" + BUCKET_NAME + "/" + objectName;
            LOGGER.info("Avatar uploaded for user {}: {}", keycloakId, user.avatarUrl);

            return user;
        } catch (Exception e) {
            LOGGER.error("Failed to upload avatar for user {}: {}", keycloakId, e.getMessage());
            throw new RuntimeException("Avatar upload failed", e);
        }
    }

    private String getExtension(String filename) {
        if (filename == null)
            return ".png";
        int lastDot = filename.lastIndexOf('.');
        return lastDot > 0 ? filename.substring(lastDot) : ".png";
    }

    private void createBucketIfNotExists() {
        try {
            boolean found = minioClient.bucketExists(BucketExistsArgs.builder().bucket(BUCKET_NAME).build());
            if (!found) {
                LOGGER.info("Creating avatar bucket: {}", BUCKET_NAME);
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(BUCKET_NAME).build());

                // Set public read-only policy for avatars
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
                        """.formatted(BUCKET_NAME);
                minioClient.setBucketPolicy(
                        SetBucketPolicyArgs.builder().bucket(BUCKET_NAME).config(policy).build());
                LOGGER.info("Public read-only policy applied to bucket: {}", BUCKET_NAME);
            }
        } catch (Exception e) {
            LOGGER.error("Error initializing avatar bucket: {}", e.getMessage());
            throw new RuntimeException("Could not initialize avatar bucket", e);
        }
    }
}
