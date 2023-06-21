package com.example.awscloud.model;

import java.time.Year;
import jakarta.persistence.AttributeConverter;

/**
 * <p>
 *     A JPA {@link AttributeConverter} that translates MySQLs YEAR type into a
 *     {@link Year} instance.
 * </p>
 */
public class YearConverter implements AttributeConverter<Year, Short> {

  @Override
  public Short convertToDatabaseColumn(Year attribute) {
    short year = (short) attribute.getValue();
    return year;
  }

  @Override
  public Year convertToEntityAttribute(Short mysqlValue) {
    Year year = Year.of(mysqlValue);
    return year;
  }
}
