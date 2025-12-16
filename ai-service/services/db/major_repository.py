from services.db.supabase_client import SupabaseClient
import json


class MajorRepository:
    def __init__(self):
        self.client = SupabaseClient().client

    def get_major_details_by_ids(self, major_ids):
        if not major_ids:
            return []

        # Convert major_ids from "major_123" format to integer 123
        numeric_ids = []
        for major_id in major_ids:
            if isinstance(major_id, str):
                numeric_part = major_id.replace("major_", "").replace("dept_", "")
                try:
                    numeric_ids.append(int(numeric_part))
                except ValueError:
                    print(f"Warning: Could not convert major_id '{major_id}' to integer")
                    continue
            else:
                numeric_ids.append(major_id)

        if not numeric_ids:
            return []

        data = (
            self.client
            .table("major_details")
            .select("*")
            .in_("major_id", numeric_ids)
            .execute()
        )

        # 학과명 필드 정규화 (majorName, name 추가)
        enriched_data = []
        for item in data.data:
            enriched_item = item.copy()
            major_name = item.get('major_name', '')
            if major_name:
                enriched_item['majorName'] = major_name
                enriched_item['name'] = major_name
            enriched_data.append(enriched_item)

        return enriched_data
