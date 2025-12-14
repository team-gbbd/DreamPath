from services.db.supabase_client import SupabaseClient


class MajorRepository:
    def __init__(self):
        self.client = SupabaseClient().client

    def get_major_details_by_ids(self, major_ids):
        data = (
            self.client
            .table("major_details")
            .select("*")
            .in_("major_id", major_ids)
            .execute()
        )
        return data.data
