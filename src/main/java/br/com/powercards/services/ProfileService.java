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

import java.util.Set;
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

    @Inject
    KeycloakService keycloakService;

    private static final Set<String> VALID_AI_PROVIDERS = Set.of("openai", "gemini", "deepseek");

    @ConfigProperty(name = "quarkus.minio.url")
    String minioUrl;

    @Transactional
    public User getOrCreateUser(String keycloakId) {
        return User.findOrCreate(keycloakId);
    }

    @Transactional
    public User updateProfile(String keycloakId, String displayName, String description, String colorPalette,
            Boolean darkMode, String aiProvider) {
        User user = User.findOrCreate(keycloakId);
        if (displayName != null) {
            user.displayName = displayName;
        }
        if (description != null) {
            user.description = description;
        }
        if (colorPalette != null) {
            user.colorPalette = colorPalette;
        }
        if (darkMode != null) {
            user.darkMode = darkMode;
        }
        // AI Provider (stored in DB)
        if (aiProvider != null) {
            if (aiProvider.isBlank()) {
                user.aiProvider = null;
            } else if (VALID_AI_PROVIDERS.contains(aiProvider)) {
                user.aiProvider = aiProvider;
            } else {
                LOGGER.warn("Invalid AI provider: {}", aiProvider);
            }
        }
        return user;
    }

    /**
     * Save the AI API key to Keycloak (non-transactional, separate from DB).
     * Returns true if successful, false on failure.
     */
    public boolean saveAiApiKey(String keycloakId, String aiApiKey) {
        if (aiApiKey == null) {
            return true; // nothing to do
        }
        try {
            keycloakService.setUserAttribute(keycloakId, "ai_api_key", aiApiKey);
            return true;
        } catch (Exception e) {
            LOGGER.error("Failed to save AI API key to Keycloak for {}: {}", keycloakId, e.getMessage());
            return false;
        }
    }

    public boolean hasAiApiKey(String keycloakId) {
        return keycloakService.hasUserAttribute(keycloakId, "ai_api_key");
    }

    public String getAiApiKey(String keycloakId) {
        return keycloakService.getUserAttribute(keycloakId, "ai_api_key");
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
