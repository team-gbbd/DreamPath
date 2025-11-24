import 'dotenv/config';
import axios from "axios";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Supabase REST Endpoint (너의 Supabase URL + Table REST 주소)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

async function fetchFaqFromSupabase() {
    console.log("📌 Supabase FAQ 불러오는 중...");

    const res = await axios.get(`${SUPABASE_URL}/rest/v1/faq?select=*`, {
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
        },
    });

    return res.data;
}

async function embedText(text) {
    const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
    });

    return response.data[0].embedding;
}

async function uploadToPinecone() {
    const indexName = process.env.PINECONE_INDEX;
    const index = pc.index(indexName);

    console.log("📌 FAQ 불러오는 중...");
    const faqList = await fetchFaqFromSupabase();

    if (faqList.length === 0) {
        console.log("⚠️ FAQ 데이터가 없습니다.");
        return;
    }

    console.log(`📌 총 ${faqList.length}개의 FAQ 찾음. 임베딩 생성 중...`);

    const vectors = [];
    for (const faq of faqList) {
        const id = faq.id.toString();
        const text = `${faq.category}\n${faq.question}\n${faq.answer}`;

        const embedding = await embedText(text);

        vectors.push({
            id,
            values: embedding,
            metadata: {
                category: faq.category,
                question: faq.question,
                answer: faq.answer,
            },
        });
    }

    console.log("📌 Pinecone 업서트 중...");
    await index.upsert(vectors);

    console.log("🎉 Pinecone 업서트 완료!");
}

uploadToPinecone().catch(console.error);
