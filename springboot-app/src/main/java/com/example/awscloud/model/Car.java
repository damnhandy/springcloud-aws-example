package com.example.awscloud.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Year;
import jakarta.persistence.*;


@Entity
@Table(name = "cars", schema = "demoapp")
public class Car {

  @Id
  @GeneratedValue(strategy = GenerationType.AUTO)
  @JsonProperty("id")
  private Integer id;

  @Column(name = "make", nullable = false, length = 100)
  @JsonProperty("make")
  private String make;

  @Column(name = "model", nullable = false, length = 100)
  private String model;

  @JsonProperty("modelYear")
  @Column(name = "model_year", nullable = false)
  @Convert(converter = YearConverter.class)
  private Year modelYear;

  @JsonProperty("color")
  @Column(name = "color", nullable = false, length = 40)
  private String color;

  @JsonProperty("description")
  @Column(name = "description", nullable = false, columnDefinition = "text")
  private String description;

  public Car() {}

  public Car(Integer id, String make, String model, Year year, String color, String description) {
    this.id = id;
    this.make = make;
    this.model = model;
    this.modelYear = year;
    this.color = color;
    this.description = description;
  }

  public Integer getId() {
    return id;
  }

  public void setId(Integer id) {
    this.id = id;
  }

  public String getMake() {
    return make;
  }

  public void setMake(String make) {
    this.make = make;
  }

  public String getModel() {
    return model;
  }

  public void setModel(String model) {
    this.model = model;
  }

  public Year getModelYear() {
    return modelYear;
  }

  public void setModelYear(Year year) {
    this.modelYear = year;
  }

  public String getColor() {
    return color;
  }

  public void setColor(String color) {
    this.color = color;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }
}
