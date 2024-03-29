package com.example.awscloud.resources;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.example.awscloud.model.Car;
import java.time.Year;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class CarResourceTests {

  @Autowired
  private TestRestTemplate restTemplate;

  @Test
  public void testFindCarById() {
    ResponseEntity<Car> entity = this.restTemplate.getForEntity("/cars/4", Car.class);
    assertEquals(HttpStatus.OK, entity.getStatusCode());
    Car car = entity.getBody();
    assertEquals("Oldsmobile", car.getMake());
    assertEquals("Bravada", car.getModel());
    assertEquals(Year.parse("2003"), car.getModelYear());
  }
}
