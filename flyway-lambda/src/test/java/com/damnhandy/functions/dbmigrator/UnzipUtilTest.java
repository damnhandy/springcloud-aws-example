package com.damnhandy.functions.dbmigrator;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.attribute.FileAttribute;
import java.util.Arrays;

public class UnzipUtilTest {

    String[] expectedFiles = {"V1__initial.sql","V2__initial_tables.sql"};

    @Test
    public void testUnzip() throws Exception {
        Path zipPath = Paths.get("src/test/resources/02eb06f56181aeae9768730d37176435de148adfc998829fc0a58161a566fe38.zip");
        Path dest = Paths.get("results").toAbsolutePath();
        if(!Files.exists(dest)) {
            Files.createDirectory(dest);
        }
        UnzipUtil.unzip(zipPath,dest);

        Files.list(dest).forEach(path -> {
            Assertions.assertTrue(Files.exists(path));
        });
    }

    @Test
    public void getName() {
        String key = "/tmp/ec96545dd03d7f1605c149c8bf4326e8d9bfcc3fe8b4d4be2a634671e6262f62.zip";
        var path = Paths.get(key);

        String filename = path.getFileName().toString();
        filename = filename.substring(0,filename.length() - 4);
        System.out.println(filename);
    }
}
