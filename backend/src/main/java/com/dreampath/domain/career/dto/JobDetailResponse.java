package com.dreampath.domain.career.dto;

import com.dreampath.domain.career.entity.JobDetail;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class JobDetailResponse {

    private final Long jobId;
    private final String summary;
    private final String wageText;
    private final String wageSource;
    private final String aptitudeText;
    private final List<Map<String, Object>> abilities;
    private final List<Map<String, Object>> majors;
    private final List<Map<String, Object>> certifications;
    private final Map<String, Object> rawData;

    public static JobDetailResponse from(JobDetail entity, ObjectMapper objectMapper) {
        return JobDetailResponse.builder()
                .jobId(entity.getJobId())
                .summary(entity.getSummary())
                .wageText(entity.getWageText())
                .wageSource(entity.getWageSource())
                .aptitudeText(entity.getAptitudeText())
                .abilities(readList(entity.getAbilities(), objectMapper))
                .majors(readList(entity.getMajors(), objectMapper))
                .certifications(readList(entity.getCertifications(), objectMapper))
                .rawData(readMap(entity.getRawData(), objectMapper))
                .build();
    }

    private static List<Map<String, Object>> readList(String value, ObjectMapper mapper) {
        if (value == null || value.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return mapper.readValue(value, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
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

