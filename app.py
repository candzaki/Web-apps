import streamlit as st
import re

# 1. DATA SOAL LENGKAP (20 Soal)
QUIZ_DATA = [
    {"question": "Sifat koligatif larutan ditentukan oleh...", "options": ["Massa jenis", "Jumlah partikel", "Jenis ikatan", "Struktur molekul", "Reaktivitas"], "answer": 1, "explanation": "Ditentukan oleh jumlah atau rasio total partikel zat terlarut."},
    {"question": "Fungsi utama etilen glikol pada radiator adalah...", "options": ["Pendingin saja", "Antibeku & penurun titik didih", "Pencegah karat", "Pewangi", "Pelumas"], "answer": 1, "explanation": "Etilen glikol mencegah pembekuan di musim dingin dan mencegah overheating."},
    {"question": "Apa penyebab penurunan tekanan uap?", "options": ["Zat menarik pelarut", "Molekul bereaksi", "Probabilitas tumbukan berkurang", "Energi kinetik hancur", "Zat memblokir pergerakan"], "answer": 2, "explanation": "Zat terlarut menurunkan probabilitas molekul pelarut murni untuk lepas ke fase gas."},
    {"question": "Jika 18g glukosa (Mr=180) dalam 250g air (Kb=0,52), kenaikan Tb-nya adalah...", "options": ["0,208 °C", "0,416 °C", "1,040 °C", "0,104 °C", "0,520 °C"], "answer": 0, "explanation": "Delta Tb = (18/180)/(0,25) * 0,52 = 0,208 °C."},
    {"question": "Manakah yang memiliki titik didih paling tinggi (0,1 m)?", "options": ["Glukosa", "Urea", "NaCl", "CaCl2", "Sukrosa"], "answer": 3, "explanation": "CaCl2 memiliki partikel paling banyak (i=3)."},
    {"question": "Proses penaburan garam (NaCl) di salju bertujuan untuk...", "options": ["Menghasilkan panas", "Menutup jalan", "Mengganggu kisi kristal es", "Menyerap kalor", "Melelehkan es dengan titik leleh Na+"], "answer": 2, "explanation": "Ion garam mengintervensi ruang geometris molekul air dan mencegah pembentukan kisi kristal es."},
    {"question": "Mekanisme fisis pendidihan larutan adalah...", "options": ["Ikatan kovalen putus", "Gaya antarmolekul melemah", "Reaksi pelarut", "Zat menguap duluan", "Ionisasi air"], "answer": 1, "explanation": "Pendidihan adalah perubahan fase fisik, gaya antarmolekul (ikatan hidrogen) melemah."},
    {"question": "Bahaya medis jika infus bersifat hipotonik adalah...", "options": ["Krenasi", "Hemolisis", "Pembekuan", "Penguapan", "Kebal osmosis"], "answer": 1, "explanation": "Air masuk ke sel darah, menyebabkan sel pecah (lisis)."},
    {"question": "Siswa yang hafal rumus tanpa paham molekul terjebak pada level...", "options": ["Makroskopik", "Partikulat", "Simbolik", "Pragmatik", "Kinetik"], "answer": 2, "explanation": "Penggunaan rumus matematika adalah representasi level simbolik."},
    {"question": "Keberadaan zat terlarut mengakibatkan diagram fase P-T...", "options": ["Bergeser ke atas", "Kurva melebar", "Bergeser ke suhu didih naik & beku turun", "Sublimasi hilang", "Tekanan naik"], "answer": 2, "explanation": "Titik didih naik (geser kanan) dan titik beku turun (geser kiri)."},
    {"question": "Perbedaan mendasar osmosis dan difusi adalah...", "options": ["Osmosis memindah zat terlarut", "Osmosis memindah pelarut", "Osmosis suhu tinggi", "Difusi butuh membran", "Identik"], "answer": 1, "explanation": "Osmosis adalah migrasi pelarut melewati membran semipermeabel."},
    {"question": "Selektivitas membran semipermeabel dikendalikan oleh...", "options": ["Niat partikel", "Gravitasi", "Probabilitas tumbukan & ukuran pori", "Reaksi kimia", "Daya hisap"], "answer": 2, "explanation": "Ini adalah mekanisme probabilitas tumbukan acak dan penyaringan molekul."},
    {"question": "Keadaan kesetimbangan dinamis osmosis berarti...", "options": ["Pergerakan berhenti", "Laju pindah neto nol", "Zat terlarut bergerak", "Hanya searah", "Membran menutup"], "answer": 1, "explanation": "Laju perpindahan bolak-balik sama besar."},
    {"question": "Mengapa menggunakan molalitas bukan molaritas?", "options": ["Liter lebih mudah", "Massa pelarut tidak terpengaruh suhu", "Menghitung ikatan", "Untuk elektrolit saja", "Mengabaikan van't Hoff"], "answer": 1, "explanation": "Massa pelarut (molalitas) tetap meski suhu berubah, sedangkan volume (molaritas) memuai."},
    {"question": "Teknologi desalinasi air laut menggunakan...", "options": ["Penguapan", "Antibeku", "Tekanan luar > osmosis", "Vakum", "Membran permeabel"], "answer": 2, "explanation": "Diberikan tekanan yang melampaui tekanan osmotik alami."},
    {"question": "0,1 mol Urea vs 0,1 mol CaCl2 dalam 1kg air, pernyataannya:", "options": ["Titik didih Urea lebih tinggi", "CaCl2 membeku lebih rendah (3x)", "Tekanan osmotik sama", "Tekanan uap sama", "Urea mendidih lebih lambat"], "answer": 1, "explanation": "CaCl2 (i=3) memiliki efek 3x lipat dibanding Urea (i=1)."},
    {"question": "Titik tripel pada diagram fase larutan...", "options": ["Suhu & tekanan naik", "Tetap", "Suhu & tekanan turun", "Tekanan naik", "Menjadi titik didih"], "answer": 2, "explanation": "Penurunan tekanan uap menarik kurva ke bawah dan ke kiri."},
    {"question": "Jika 5,85g NaCl (Mr=58,5) dalam 500g air (Kf=1,86), titik bekunya adalah...", "options": ["-0,372 °C", "-0,744 °C", "0,372 °C", "0,744 °C", "-1,860 °C"], "answer": 1, "explanation": "m=0,2, i=2, delta Tf = 0,2 * 1,86 * 2 = 0,744. Titik beku = -0,744 °C."},
    {"question": "Sifat koligatif larutan yang benar:", "options": ["Massa jenis & titik beku", "Tekanan osmotik & derajat ionisasi", "Penurunan P, kenaikan Tb, penurunan Tf, tekanan Osmotik", "Tekanan hidrostatik & indeks bias", "Kenaikan P & penurunan Tb"], "answer": 2, "explanation": "Empat sifat utama koligatif: ΔP, ΔTb, ΔTf, dan Π."},
    {"question": "Untuk menghindari kelelahan kognitif, visualisasi dibuat dengan prinsip...", "options": ["Asam Basa Lewis", "Entropi", "Lavoisier", "Cognitive Load Theory", "Efek Tyndall"], "answer": 3, "explanation": "Segmenting visualisasi mengikuti Cognitive Load Theory."}
]

# 2. KONFIGURASI HALAMAN
st.set_page_config(page_title="LabKimia", layout="wide")
st.title("🧪 LabKimia - Sifat Koligatif Larutan")

tab1, tab2, tab3 = st.tabs(["Dashboard", "Kerjakan Kuis", "Kalkulator Mr"])

with tab1:
    st.header("Dashboard Belajar")
    st.metric("Total Soal", len(QUIZ_DATA))
    st.info("Pilih tab 'Kerjakan Kuis' untuk memulai.")

with tab2:
    st.header("Kuis Kimia")
    for i, q in enumerate(QUIZ_DATA):
        with st.expander(f"Soal {i+1}: {q['question'][:50]}..."):
            ans = st.radio("Pilihan:", q['options'], key=f"q{i}")
            if st.button("Cek", key=f"b{i}"):
                if q['options'].index(ans) == q['answer']:
                    st.success("Benar!")
                else:
                    st.error(f"Salah. Penjelasan: {q['explanation']}")

with tab3:
    st.header("Kalkulator Mr (Sederhana)")
    formula = st.text_input("Masukkan rumus molekul (H, C, O, Na, Cl):")
    if st.button("Hitung"):
        try:
            atoms = {'H': 1, 'C': 12, 'O': 16, 'Na': 23, 'Cl': 35.5}
            pattern = re.findall(r'([A-Z][a-z]*)(\d*)', formula)
            mr = sum(atoms[a] * (int(n) if n else 1) for a, n in pattern)
            st.success(f"Mr {formula} adalah {mr}")
        except:
            st.error("Format salah! Gunakan format seperti H2O atau NaCl.")
