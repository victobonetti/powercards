package br.com.powercards.resources;

import br.com.powercards.dto.ProfileRequest;
import br.com.powercards.dto.ProfileResponse;
import br.com.powercards.model.User;
import br.com.powercards.services.ProfileService;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.jboss.resteasy.reactive.multipart.FileUpload;
import org.jboss.resteasy.reactive.RestForm;

import java.io.FileInputStream;
import java.io.IOException;

@Path("/v1/profile")
@Produces(MediaType.APPLICATION_JSON)
public class ProfileResource {

    @Inject
    SecurityIdentity identity;

    @Inject
    ProfileService profileService;

    @GET
    public ProfileResponse getProfile() {
        String keycloakId = identity.getPrincipal().getName();
        User user = profileService.getOrCreateUser(keycloakId);
        return toResponse(user);
    }

    @PUT
    @Consumes(MediaType.APPLICATION_JSON)
    public ProfileResponse updateProfile(ProfileRequest request) {
        String keycloakId = identity.getPrincipal().getName();
        User user = profileService.updateProfile(keycloakId, request.displayName(), request.description());
        return toResponse(user);
    }

    @POST
    @Path("/avatar")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    public ProfileResponse uploadAvatar(@RestForm("file") FileUpload file) {
        if (file == null || file.filePath() == null) {
            throw new BadRequestException("No file provided");
        }

        String keycloakId = identity.getPrincipal().getName();

        try (FileInputStream fis = new FileInputStream(file.filePath().toFile())) {
            User user = profileService.uploadAvatar(
                    keycloakId,
                    fis,
                    file.fileName(),
                    file.contentType(),
                    file.size());
            return toResponse(user);
        } catch (IOException e) {
            throw new InternalServerErrorException("Failed to read uploaded file", e);
        }
    }

    @POST
    @Path("/banner")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    public ProfileResponse uploadBanner(@RestForm("file") FileUpload file) {
        if (file == null || file.filePath() == null) {
            throw new BadRequestException("No file provided");
        }

        String keycloakId = identity.getPrincipal().getName();

        try (FileInputStream fis = new FileInputStream(file.filePath().toFile())) {
            User user = profileService.uploadBanner(
                    keycloakId,
                    fis,
                    file.fileName(),
                    file.contentType(),
                    file.size());
            return toResponse(user);
        } catch (IOException e) {
            throw new InternalServerErrorException("Failed to read uploaded file", e);
        }
    }

    private ProfileResponse toResponse(User user) {
        return new ProfileResponse(
                user.id,
                user.keycloakId,
                user.displayName,
                user.avatarUrl,
                user.bannerUrl,
                user.description);
    }
}
