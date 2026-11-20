import vvk from "../assets/10.jpeg";
import sany from "../assets/5.jpeg";
import naba from "../assets/3.jpeg";
import psp from "../assets/1.jpeg";
import yg from "../assets/4.jpeg";
import ab from "../assets/9.jpeg";
import cd from "../assets/8.jpeg";
import ef from "../assets/7.jpeg";
import gh from "../assets/6.jpeg";
import ij from "../assets/2.jpeg";

export const legacyTournamentAbout = {
  intro: "Discover the history and people behind Pundag Premier League.",
  sections: [
    {
      id: "history", title: "Tournament history", body: "Champions and runners-up from each season of PPL.",
      entries: [
        [2019, "Mayadih Sixer", "Jay Baba Baro Saheb, Sidhi"],
        [2020, "Kings XI, Pundag", "Rampur Trophy Fighters"],
        [2021, "Skipped", "Skipped"],
        [2022, "SSAC Ananda Marga College", "DD Warriors, Pundag"],
        [2023, "Team Avengers, Darikuri", "G. K. Sunrise Tigers"],
        [2024, "DD Warriors, Pundag", "Royal Challengers, Singghagra"],
        [2025, "TBD", "TBD"],
      ].map(([year, champion, runner]) => ({ id: String(year), title: String(year), subtitle: `Champion: ${champion}`, description: `Runner-up: ${runner}`, imageUrl: "" })),
    },
    { id: "mission", title: "Our mission", body: "Our mission is to provide a platform for aspiring cricketers to showcase their talent, promote sportsmanship, and build a strong cricketing culture within the community. PPL aims to empower young players, encourage fitness, and create memorable sporting experiences.", entries: [] },
    { id: "sponsors", title: "Sponsors", body: "We are proud to be supported by local businesses and partners who believe in the growth of sports.", entries: [] },
    {
      id: "committee", title: "Organising committee", body: "Meet the people behind PPL.",
      entries: [
        ["Vivekananda Mahato", "Chairman", vvk], ["Naba Kumar Mahato", "Vice-Chairman", naba],
        ["Yudhisthir Gope", "Logistics", yg], ["Sany Paramanik", "Secretary", sany],
        ["Pushpendu Paramanik", "Member", psp], ["Manoj Gope", "Member", ab],
        ["Bikash Mahato", "Member", cd], ["Bikash Mahato", "Member", ef],
        ["Sanat Mahato", "Member", gh], ["Rahul Adhikary", "Member", ij],
      ].map(([name, role, image], index) => ({ id: `member-${index}`, title: name, subtitle: role, description: "", imageUrl: image })),
    },
  ],
};
