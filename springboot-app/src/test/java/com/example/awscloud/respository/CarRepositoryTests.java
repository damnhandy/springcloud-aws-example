package com.example.awscloud.respository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import com.example.awscloud.model.Car;
import com.example.awscloud.repository.CarRepository;
import java.time.Year;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
public class CarRepositoryTests {

  @Autowired
  CarRepository repository;

  @Test
  public void testFindCarById() {
    Car car = repository.findCarById(4);
    assertNotNull(car);
    assertEquals("Oldsmobile", car.getMake());
    assertEquals("Bravada", car.getModel());
    assertEquals(Year.parse("2003"), car.getModelYear());
  }

  @Test
  public void testFindAll() {
    List<Car> cars = repository.listAllCars();
    assertNotNull(cars);
    assertEquals(1000, cars.size());
  }
}
