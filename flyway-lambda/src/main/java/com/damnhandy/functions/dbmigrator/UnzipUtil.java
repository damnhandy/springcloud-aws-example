package com.damnhandy.functions.dbmigrator;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.*;
import java.util.Enumeration;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
import java.util.zip.ZipInputStream;

public final class UnzipUtil {

    private static final Logger logger = LogManager.getLogger(UnzipUtil.class);

    public static void unzip(Path zipFilePath, Path destination) {
        try (ZipFile zip = new ZipFile(zipFilePath.toFile())) {
            logger.debug("Zip has {} entries",zip.size());
            zip.stream().forEach(entry -> {
                try {
                    Path newFilePath = destination.resolve(entry.getName()).toAbsolutePath();
                    logger.debug("Writing entry to {}", newFilePath);
                    if (entry.isDirectory()) {
                        Files.createDirectories(newFilePath);
                    }
                    else {
                        if(!Files.exists(newFilePath.getParent())) {
                            Files.createDirectories(newFilePath.getParent());
                        }
                        try(InputStream in = zip.getInputStream(entry)) {
                            Files.copy(in, newFilePath, StandardCopyOption.REPLACE_EXISTING);
                        }
                    }
                } catch (IOException e) {
                    throw new RuntimeException(e);
                }
            });
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    public static void unzipOld(Path zipFilePath, Path destination) {
        logger.debug("Unzipping {} to {}", zipFilePath, destination);
        try (ZipInputStream zis = new ZipInputStream(Files.newInputStream(zipFilePath))) {

            ZipEntry entry = zis.getNextEntry();
            logger.debug("Zip entry: {}",entry.getName());
            while (entry != null) {

                Path newFilePath = destination.resolve(entry.getName()).toAbsolutePath();
                logger.debug("Writing entry to {}", newFilePath);
                if (entry.isDirectory()) {
                    Files.createDirectories(newFilePath);
                } else {
                    if(!Files.exists(newFilePath.getParent())) {
                        Files.createDirectories(newFilePath.getParent());
                    }

                    try (OutputStream bos = Files.newOutputStream(destination.resolve(newFilePath))) {
                        byte[] buffer = new byte[4096];
                        int location;
                        while ((location = zis.read(buffer)) != -1) {
                            bos.write(buffer, 0, location);
                        }
                    }
                }
                entry = zis.getNextEntry();
            }
        } catch (IOException e) {
            logger.error("Failed to unzip package", e);
            throw new RuntimeException(e);
        }
    }
}
