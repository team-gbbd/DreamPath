package com.dreampath.domain.career.dto;

import com.dreampath.domain.career.entity.MajorDetail;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Collections;
import java.util.Map;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class MajorDetailResponse {

    private final Long majorId;
    private final String majorName;
    private final String summary;
    private final String interest;
    private final String propertyText;
    private final String job;
    private final String salary;
    private final String employment;
    private final Map<String, Object> rawData;

    public static MajorDetailResponse from(MajorDetail entity, ObjectMapper objectMapper) {
        return MajorDetailResponse.builder()
                .majorId(entity.getMajorId())
                .majorName(entity.getMajorName())
                .summary(entity.getSummary())
                .interest(entity.getInterest())
                .propertyText(entity.getPropertyText())
                .job(entity.getJob())
                .salary(entity.getSalary())
                .employment(entity.getEmployment())
                .rawData(readMap(entity.getRawData(), objectMapper))
                .build();
    }

    private static Map<String, Object> readMap(String value, ObjectMapper mapper) {
        if (value == null || value.isBlank()) {
            return Collections.emptyMap();
        }
        try {
            return mapper.readValue(value, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            return Collections.emptyMap();
        }
    }
}

