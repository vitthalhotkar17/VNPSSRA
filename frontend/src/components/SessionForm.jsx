import { useState } from "react";

const classOptions = ["B.Sc IT", "BCA", "B.Tech", "MBA"];
const divisionOptions = ["A", "B", "C"];
const lectureOptions = ["Lecture 1", "Lecture 2", "Lecture 3", "Lecture 4"];
const durationOptions = ["15 mins", "30 mins", "45 mins", "60 mins", "90 mins"];

export default function SessionForm({ subjects, onSave }) {
  const [subject, setSubject] = useState(subjects[0] || "");
  const [className, setClassName] = useState(classOptions[0]);
  const [division, setDivision] = useState(divisionOptions[0]);
  const [lecture, setLecture] = useState(lectureOptions[0]);
  const [duration, setDuration] = useState(durationOptions[0]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!subject) return;
    onSave({ subject, className, division, lecture, duration });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-card">
      <div className="space-y-4">
        <label className="label">Select Subject</label>
        <select value={subject} onChange={(e) => setSubject(e.target.value)} className="input">
          {subjects.map((sub) => (<option key={sub} value={sub}>{sub}</option>))}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-4">
          <label className="label">Class</label>
          <select value={className} onChange={(e) => setClassName(e.target.value)} className="input">
            {classOptions.map((item) => (<option key={item} value={item}>{item}</option>))}
          </select>
        </div>
        <div className="space-y-4">
          <label className="label">Division</label>
          <select value={division} onChange={(e) => setDivision(e.target.value)} className="input">
            {divisionOptions.map((item) => (<option key={item} value={item}>{item}</option>))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-4">
          <label className="label">Lecture</label>
          <select value={lecture} onChange={(e) => setLecture(e.target.value)} className="input">
            {lectureOptions.map((item) => (<option key={item} value={item}>{item}</option>))}
          </select>
        </div>
        <div className="space-y-4">
          <label className="label">Duration</label>
          <select value={duration} onChange={(e) => setDuration(e.target.value)} className="input">
            {durationOptions.map((item) => (<option key={item} value={item}>{item}</option>))}
          </select>
        </div>
      </div>
      <button type="submit" className="btn-primary w-full">Start Session</button>
    </form>
  );
}
