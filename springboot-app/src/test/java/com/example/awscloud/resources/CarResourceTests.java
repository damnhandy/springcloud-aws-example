package com.example.awscloud.resources;

import com.example.awscloud.model.Car;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.web.server.LocalServerPort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.web.WebAppConfiguration;

import java.net.URI;
import java.time.Year;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class CarResourceTests {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    public void testFindCarById() {
        ResponseEntity<Car> entity = this.restTemplate.getForEntity("/cars/4", Car.class);
        assertEquals(HttpStatus.OK, entity.getStatusCode());
        Car car = entity.getBody();
        assertEquals("Oldsmobile",car.getMake());
        assertEquals("Bravada",car.getModel());
        assertEquals(Year.parse("2003"),car.getModelYear());
    }
}
