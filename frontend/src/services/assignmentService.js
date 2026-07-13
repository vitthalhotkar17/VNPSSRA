import { api } from "./api.js";

export const assignmentService = {
  async getAll() {
    const { data } = await api.get("/assignments");
    return data.data?.assignments || [];
  },

  async getSubjectsForFaculty(facultyId) {
    const { data } = await api.get(`/assignments/faculty/${facultyId}`);
    return data.data?.subjects || [];
  },

  async saveForFaculty(facultyId, subjects) {
    const { data } = await api.post("/assignments", { facultyId, subjects });
    return data.data;
  },
};
