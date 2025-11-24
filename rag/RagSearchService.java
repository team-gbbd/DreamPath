package com.dreampath.rag;

import io.pinecone.Pinecone;
import io.pinecone.generated.QueryRequest;
import io.pinecone.generated.QueryResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class RagSearchService {

    @Value("${pinecone.api.key}")
    private String apiKey;

    @Value("${pinecone.index.name}")
    private String indexName;

    public QueryResponse search(float[] vector) {

        Pinecone client = new Pinecone.Builder(apiKey).build();

        QueryRequest request = QueryRequest.newBuilder()
                .setTopK(3)
                .setVectorData(io.pinecone.generated.Vector.newBuilder()
                        .addAllValues(toList(vector))
                        .build())
                .build();

        return client.getIndex(indexName).query(request);
    }

    private java.util.List<Float> toList(float[] arr) {
        java.util.List<Float> list = new java.util.ArrayList<>();
        for (float v : arr) list.add(v);
        return list;
    }
}
