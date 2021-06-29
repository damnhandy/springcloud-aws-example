package com.example.awscloud.resources;

import com.example.awscloud.model.Car;
import com.example.awscloud.repository.CarRepository;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.springframework.stereotype.Service;

@Service
@Path("/cars")
@Produces(MediaType.APPLICATION_JSON)
@Consumes({ MediaType.APPLICATION_JSON, MediaType.APPLICATION_FORM_URLENCODED })
public class CarResource {

  CarRepository carRepository;

  public CarResource(CarRepository carRepository) {
    this.carRepository = carRepository;
  }

  @GET
  public Response findAll() {
    return Response.ok(carRepository.listAllCars()).build();
  }

  @GET
  @Path("/{id}")
  public Response findCarById(@PathParam("id") Integer id) {
    Car car = carRepository.findCarById(id);
    return Response.ok(car).build();
  }
}
