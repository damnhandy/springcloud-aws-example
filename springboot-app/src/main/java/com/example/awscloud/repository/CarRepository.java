package com.example.awscloud.repository;

import com.example.awscloud.model.Car;
import jakarta.persistence.EntityManager;
import java.util.List;
import org.springframework.stereotype.Repository;

@Repository
public class CarRepository {

  private EntityManager entityManager;

  /**
   *
   * @param entityManager
   */
  public CarRepository(EntityManager entityManager) {
    this.entityManager = entityManager;
  }

  /**
   *
   * @param id
   * @return
   */
  public Car findCarById(Integer id) {
    return entityManager.find(Car.class, id);
  }

  /**
   *
   * @return
   */
  public List<Car> listAllCars() {
    return entityManager.createQuery("SELECT c FROM Car c", Car.class).getResultList();
  }
}
