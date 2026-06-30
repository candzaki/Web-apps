import json
import os
import sqlite3
from datetime import datetime
from functools import wraps

from flask import Flask, flash, jsonify, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "labkimia-secret-key")
app.config["DATABASE"] = os.environ.get(
    "DATABASE_PATH",
    os.path.join(app.root_path, "quiz_app.db"),
)

QUIZ_DATA = [
    {
        "question": "Sifat koligatif larutan adalah sifat fisis larutan yang nilai besarannya ditentukan secara eksklusif oleh...",
        "options": [
            "Massa jenis dan ukuran jari-jari atom zat terlarut",
            "Jumlah atau rasio total partikel zat terlarut di dalam pelarut",
            "Sifat kimiawi dan jenis ikatan dari zat terlarut",
            "Struktur geometri dari molekul zat terlarut",
            "Tingkat reaktivitas zat terlarut terhadap pelarut air"
        ],
        "answer": 1,
        "explanation": "Sifat koligatif larutan merujuk pada sekumpulan sifat fisik yang nilainya ditentukan secara eksklusif oleh rasio atau konsentrasi total partikel zat terlarut yang efektif berada di dalam pelarut, bukan oleh parameter identitas, massa molar, atau jenis zat tersebut.",
        "topic": "Konsep Dasar",
        "difficulty": "Dasar"
    },
    {
        "question": "Pada negara empat musim, cairan etilen glikol sering ditambahkan ke dalam air radiator kendaraan bermotor. Tujuan utama penambahan zat tersebut secara fisis adalah...",
        "options": [
            "Menurunkan titik didih air radiator agar mesin tetap dingin di musim panas.",
            "Mencegah air radiator membeku di musim dingin dan menaikkan titik didihnya untuk mencegah mesin overheating.",
            "Menaikkan tekanan uap air radiator agar sirkulasi cairan di dalam mesin menjadi lebih lancar.",
            "Mencegah penguapan etilen glikol karena sifatnya yang mudah terbakar di dalam mesin.",
            "Mengurangi tekanan osmotik di dalam komponen mesin radiator agar tidak bocor."
        ],
        "answer": 1,
        "explanation": "Etilen glikol berfungsi sebagai zat antibeku (antifreeze) yang memiliki efek ganda: menurunkan titik beku (mencegah air membeku saat musim salju) sekaligus menaikkan titik didih (mencegah air mendidih saat mesin panas).",
        "topic": "Aplikasi Makroskopik",
        "difficulty": "Menengah"
    },
    {
        "question": "Siswa sering mengalami miskonsepsi 'blocking model' di mana mereka menganggap partikel zat terlarut menutupi permukaan cairan seperti selimut secara fisik. Penjelasan submikroskopis yang benar mengenai penurunan tekanan uap adalah...",
        "options": [
            "Zat terlarut menarik molekul pelarut ke dasar wadah sehingga molekul pelarut tidak bisa naik ke permukaan.",
            "Molekul pelarut bereaksi dengan zat terlarut membentuk gas baru yang lebih berat.",
            "Penurunan laju penguapan terjadi akibat turunnya probabilitas tumbukan termodinamika molekul pelarut karena rasio molekul pelarut di permukaan berkurang.",
            "Energi kinetik molekul pelarut dihancurkan seluruhnya oleh partikel zat terlarut yang masuk.",
            "Zat terlarut memblokir pergerakan pelarut dengan membentuk ikatan kovalen baru yang sangat kuat."
        ],
        "answer": 2,
        "explanation": "Secara ilmiah, zat terlarut terdistribusi homogen. Kehadiran zat terlarut non-volatil menurunkan probabilitas molekul pelarut murni untuk lepas ke fase gas, bukan murni menutup ruang secara mekanis-statis.",
        "topic": "Penurunan Tekanan Uap",
        "difficulty": "Lanjutan"
    },
    {
        "question": "Suatu larutan dibuat dengan melarutkan 18 gram glukosa (Mr = 180) ke dalam 250 gram air. Jika tetapan kenaikan titik didih molal air (Kb) = 0,52 °C/m, maka kenaikan titik didih larutan tersebut adalah...",
        "options": [
            "0,208 °C",
            "0,416 °C",
            "1,040 °C",
            "0,104 °C",
            "0,520 °C"
        ],
        "answer": 0,
        "explanation": "Mol glukosa = 18/180 = 0,1 mol. Molalitas (m) = 0,1 mol / 0,25 kg = 0,4 m. Karena glukosa adalah zat non-elektrolit (i = 1), ΔTb = m × Kb = 0,4 × 0,52 = 0,208 °C.",
        "topic": "Kenaikan Titik Didih",
        "difficulty": "Menengah"
    },
    {
        "question": "Jika konsentrasi molal yang digunakan sama (misal 0,1 m), larutan manakah di bawah ini yang akan memiliki titik didih paling tinggi?",
        "options": [
            "Glukosa (C6H12O6)",
            "Urea (CO(NH2)2)",
            "Natrium Klorida (NaCl)",
            "Kalsium Klorida (CaCl2)",
            "Sukrosa (C12H22O11)"
        ],
        "answer": 3,
        "explanation": "Sifat koligatif sebanding dengan jumlah partikel (faktor van't Hoff). Glukosa, urea, sukrosa (i=1). NaCl (i=2). CaCl2 terurai menjadi 3 partikel (Ca2+ dan 2Cl-, i=3). Semakin banyak partikel, efek sifat koligatif semakin besar.",
        "topic": "Larutan Elektrolit",
        "difficulty": "Menengah"
    },
    {
        "question": "Penjelasan submikroskopis yang tepat mengenai proses penaburan garam (NaCl) di jalan raya yang tertutup salju adalah...",
        "options": [
            "Garam bereaksi dengan salju menghasilkan panas yang melelehkan es dari dalam.",
            "Partikel garam menutupi permukaan jalan sehingga salju baru tidak bisa menempel.",
            "Ion-ion garam secara spasial mengganggu keteraturan molekul air saat akan membentuk kisi kristal padat, sehingga sistem butuh suhu lebih dingin untuk membeku.",
            "Ikatan ionik garam menyerap seluruh kalor dari lingkungan sekitarnya.",
            "Ion Na+ memiliki titik leleh yang sangat tinggi sehingga secara fisik menghangatkan salju di sekitarnya."
        ],
        "answer": 2,
        "explanation": "Miskonsepsi yang sering terjadi adalah menganggap zat terlarut sebagai 'pemanas internal'. Secara fisis ion-ion garam mengintervensi ruang geometris molekul air dan mencegah pembentukan kisi kristal es yang rapi.",
        "topic": "Penurunan Titik Beku",
        "difficulty": "Lanjutan"
    },
    {
        "question": "Banyak siswa keliru menganggap ikatan kimia H-O terputus saat larutan mendidih. Mekanisme fisis sesungguhnya saat pendidihan larutan adalah...",
        "options": [
            "Ikatan kovalen molekul air terputus menjadi atom hidrogen dan oksigen bebas.",
            "Molekul pelarut mengumpulkan energi kinetik untuk mengatasi gaya tarik antarmolekul agar dapat bertransisi ke fase gas.",
            "Molekul air bereaksi dengan partikel terlarut dan gas di udara membentuk senyawa baru.",
            "Partikel zat terlarut menguap terlebih dahulu dengan menyerap panas.",
            "Seluruh energi panas diserap untuk mengionisasi air menjadi ion H+ dan OH-."
        ],
        "answer": 1,
        "explanation": "Pendidihan adalah perubahan fase fisik. Molekul air (H2O) tetap utuh. Panas digunakan untuk melemahkan tarikan antarmolekul (intermolecular forces), bukan untuk memutuskan ikatan kovalen di dalam molekul (intramolecular bonds).",
        "topic": "Miskonsepsi Kognitif",
        "difficulty": "Lanjutan"
    },
    {
        "question": "Cairan infus yang diberikan di rumah sakit diformulasikan harus isotonik dengan cairan sel darah merah. Apa bahaya medis jika cairan infus bersifat hipotonik?",
        "options": [
            "Sel darah merah akan mengkerut (krenasi) karena air keluar dari sel.",
            "Sel darah merah akan membengkak dan pecah (lisis) karena air masuk ke dalam sel.",
            "Darah pasien akan mengalami pembekuan secara perlahan.",
            "Tekanan darah pasien akan menurun drastis karena pelarut menguap.",
            "Tidak ada efek samping karena membran sel darah kebal terhadap osmosis."
        ],
        "answer": 1,
        "explanation": "Jika infus hipotonik (lebih encer), molekul pelarut (air) akan mengalir secara osmosis masuk ke dalam sel darah merah yang lebih pekat, memicu hemolisis (pecahnya sel darah).",
        "topic": "Tekanan Osmotik",
        "difficulty": "Menengah"
    },
    {
        "question": "Berdasarkan Teori Representasi Kimia Johnstone, siswa yang hafal rumus koligatif namun gagal membayangkan interaksi molekul, berarti terjebak pada reduksi algoritma di level...",
        "options": [
            "Makroskopik",
            "Partikulat",
            "Simbolik",
            "Pragmatik",
            "Kinetik"
        ],
        "answer": 2,
        "explanation": "Menyelesaikan perhitungan menggunakan rumus matematika berada pada level Simbolik. Tanpa pemahaman submikroskopis, ini hanyalah sekadar ilusi kompetensi.",
        "topic": "Representasi Kimia",
        "difficulty": "Dasar"
    },
    {
        "question": "Pada diagram fase P-T, keberadaan zat terlarut non-volatil mengakibatkan...",
        "options": [
            "Kurva cair-gas dan padat-cair bergeser ke suhu yang lebih tinggi.",
            "Kurva cair-gas bergeser ke suhu rendah, sementara padat-cair ke suhu tinggi.",
            "Kurva cair-gas bergeser ke suhu yang lebih tinggi, sementara kurva padat-cair bergeser ke suhu yang lebih rendah.",
            "Kurva sublimasi menghilang dari diagram fase.",
            "Tidak ada pergeseran garis, hanya letak tekanan uap jenuh yang naik."
        ],
        "answer": 2,
        "explanation": "Penurunan tekanan uap menyebabkan larutan mendidih di suhu yang lebih tinggi (kurva cair-gas bergeser ke kanan) dan membeku di suhu yang lebih rendah (kurva padat-cair bergeser ke kiri).",
        "topic": "Diagram Fase P-T",
        "difficulty": "Lanjutan"
    },
    {
        "question": "Berdasarkan analisis literatur, siswa sering keliru menyamakan osmosis dengan difusi. Perbedaan mendasar antara osmosis dan difusi pada sistem larutan adalah...",
        "options": [
            "Osmosis memindahkan zat terlarut dari konsentrasi rendah ke tinggi, difusi sebaliknya.",
            "Pada osmosis yang berpindah adalah partikel pelarut melalui membran semipermeabel, sedangkan pada difusi partikel zat terlarut yang menyebar.",
            "Osmosis hanya terjadi pada cairan panas, sedangkan difusi terjadi pada suhu ruang.",
            "Difusi membutuhkan membran semipermeabel, sedangkan osmosis terjadi di ruang terbuka.",
            "Keduanya adalah proses yang identik, hanya istilah yang berbeda."
        ],
        "answer": 1,
        "explanation": "Miskonsepsi yang umum adalah menganggap zat terlarut yang berpindah saat osmosis. Padahal, osmosis adalah migrasi molekul pelarut (misal: air) melewati membran semipermeabel menuju area yang lebih pekat.",
        "topic": "Miskonsepsi Osmosis",
        "difficulty": "Menengah"
    },
    {
        "question": "Sebagian siswa menganggap membran semipermeabel sebagai 'penjaga gerbang pintar' yang sengaja memilih molekul. Secara submikroskopis ilmiah, selektivitas membran semata-mata dikendalikan oleh...",
        "options": [
            "Niat partikel pelarut untuk mengencerkan larutan.",
            "Gaya gravitasi bumi yang menarik zat terlarut ke dasar wadah.",
            "Probabilitas statistik tumbukan partikel dan batasan ukuran pori fisis membran.",
            "Reaksi kimia antara membran dan zat terlarut.",
            "Daya hisap yang diciptakan oleh ion-ion zat terlarut."
        ],
        "answer": 2,
        "explanation": "Miskonsepsi antropomorfik sering menganggap membran memiliki 'kesadaran'. Secara ilmiah, ini adalah murni mekanisme probabilitas tumbukan acak dan penyaringan molekul berdasarkan ukuran pori fisik membran.",
        "topic": "Tekanan Osmotik",
        "difficulty": "Lanjutan"
    },
    {
        "question": "Saat proses osmosis telah mencapai keadaan kesetimbangan (equilibrium state), pernyataan yang tepat mengenai pergerakan molekul pelarut adalah...",
        "options": [
            "Semua pergerakan partikel terhenti total secara mutlak.",
            "Molekul pelarut tetap bergerak menembus membran dari kedua arah dengan laju perpindahan neto (bersih) sama dengan nol.",
            "Hanya molekul zat terlarut yang mulai bergerak bolak-balik.",
            "Molekul pelarut hanya bergerak ke arah larutan pekat secara perlahan.",
            "Membran semipermeabel akan menutup pori-porinya secara otomatis."
        ],
        "answer": 1,
        "explanation": "Siswa sering menganggap kesetimbangan berarti 'statis'. Padahal, kesetimbangan fisis bersifat dinamis; molekul terus berpindah bolak-balik dengan laju yang sama, sehingga tidak ada perubahan makroskopis (volume/tekanan).",
        "topic": "Kesetimbangan Dinamis",
        "difficulty": "Menengah"
    },
    {
        "question": "Mengapa dalam perhitungan sifat koligatif seperti kenaikan titik didih dan penurunan titik beku disarankan menggunakan satuan molalitas (m) dan bukan molaritas (M)?",
        "options": [
            "Karena molalitas menggunakan satuan liter yang lebih mudah diukur di lab.",
            "Molalitas berbasis pada massa pelarut yang nilainya tetap, sedangkan molaritas berbasis volume yang nilainya dapat memuai akibat fluktuasi suhu.",
            "Molalitas memperhitungkan jenis ikatan zat terlarut.",
            "Molaritas hanya dapat digunakan untuk larutan elektrolit kuat.",
            "Molalitas dapat mengabaikan peran faktor van't Hoff."
        ],
        "answer": 1,
        "explanation": "Molaritas bergantung pada volume larutan, dan volume cairan dapat memuai/menyusut jika suhu berubah (terutama saat mendidih/membeku). Molalitas menggunakan massa pelarut yang tidak terpengaruh oleh suhu.",
        "topic": "Satuan Konsentrasi",
        "difficulty": "Menengah"
    },
    {
        "question": "Teknologi desalinasi air laut untuk menghasilkan air tawar murni menggunakan prinsip osmosis balik (reverse osmosis). Proses ini dapat terjadi apabila...",
        "options": [
            "Air laut dipanaskan hingga menguap sempurna lalu diembunkan kembali.",
            "Zat anti-beku ditambahkan ke dalam air laut untuk membunuh bakteri.",
            "Diberikan tekanan hidrostatik dari luar pada bagian air laut yang besarnya melampaui tekanan osmotik alaminya.",
            "Air tawar disedot menggunakan pompa vakum bertekanan rendah.",
            "Membran semipermeabel diganti dengan membran permeabel berpori besar."
        ],
        "answer": 2,
        "explanation": "Osmosis balik terjadi dengan memaksa pelarut (air) mengalir dari area pekat (air laut) ke area encer (air tawar). Ini melawan aliran alami dan hanya bisa dicapai jika diberikan tekanan buatan yang lebih besar dari tekanan osmotik.",
        "topic": "Aplikasi Makroskopik",
        "difficulty": "Lanjutan"
    },
    {
        "question": "Sebanyak 0,1 mol Urea (non-elektrolit) dan 0,1 mol CaCl2 (terionisasi sempurna) masing-masing dilarutkan dalam 1 Kg air. Pernyataan yang benar mengenai kedua larutan tersebut adalah...",
        "options": [
            "Titik didih larutan Urea akan lebih tinggi daripada CaCl2.",
            "Penurunan titik beku larutan CaCl2 akan tiga kali lebih besar daripada larutan Urea.",
            "Keduanya memiliki tekanan osmotik yang persis sama di suhu yang sama.",
            "Tekanan uap larutan CaCl2 akan lebih tinggi daripada tekanan uap larutan Urea.",
            "Larutan Urea akan mendidih lebih lambat daripada air murni, tetapi lebih lambat dari CaCl2."
        ],
        "answer": 1,
        "explanation": "Urea adalah non-elektrolit (i = 1), menghasilkan 0,1 mol partikel. CaCl2 adalah elektrolit (Ca2+ dan 2Cl-, i = 3), menghasilkan 0,3 mol partikel. Karena partikelnya 3x lebih banyak, nilai sifat koligatif CaCl2 3x lebih besar.",
        "topic": "Faktor van't Hoff",
        "difficulty": "Lanjutan"
    },
    {
        "question": "Kehadiran zat terlarut non-volatil akan mengubah posisi titik tripel (triple point) pada diagram fase pelarut murni. Pergeseran yang terjadi secara tepat adalah...",
        "options": [
            "Titik tripel bergeser ke arah suhu yang lebih tinggi dan tekanan yang lebih tinggi.",
            "Titik tripel tidak bergeser, hanya kurvanya yang melebar.",
            "Titik tripel bergeser ke arah suhu yang lebih rendah dan tekanan yang lebih rendah.",
            "Titik tripel bergeser ke arah tekanan tinggi tanpa perubahan suhu.",
            "Titik tripel menghilang dan menjadi titik didih normal."
        ],
        "answer": 2,
        "explanation": "Pada diagram P-T larutan, penurunan tekanan uap secara langsung menarik kurva kesetimbangan ke bawah, yang menyebabkan titik perpotongan antara fasa padat, cair, dan gas (titik tripel) ikut bergeser ke kiri (suhu turun) dan ke bawah (tekanan turun).",
        "topic": "Diagram Fase P-T",
        "difficulty": "Lanjutan"
    },
    {
        "question": "Jika 5,85 gram NaCl (Mr = 58,5) dilarutkan dalam 500 gram air (Kf air = 1,86 °C/m) dan terdisosiasi sempurna, pada suhu berapakah larutan tersebut mulai membeku?",
        "options": [
            "-0,372 °C",
            "-0,744 °C",
            "0,372 °C",
            "0,744 °C",
            "-1,860 °C"
        ],
        "answer": 1,
        "explanation": "Mol NaCl = 5,85 / 58,5 = 0,1 mol. Molalitas m = 0,1 / 0,5 kg = 0,2 m. NaCl terdisosiasi menjadi Na+ dan Cl- (i=2). ΔTf = m × Kf × i = 0,2 × 1,86 × 2 = 0,744 °C. Titik beku larutan = 0 - 0,744 = -0,744 °C.",
        "topic": "Penurunan Titik Beku",
        "difficulty": "Menengah"
    },
    {
        "question": "Manakah kelompok sifat di bawah ini yang SELURUHNYA termasuk sifat koligatif larutan?",
        "options": [
            "Massa jenis, penurunan titik beku, viskositas, dan kenaikan titik didih.",
            "Tekanan osmotik, penurunan tekanan uap, derajat ionisasi, dan titik beku normal.",
            "Penurunan tekanan uap, kenaikan titik didih, penurunan titik beku, dan tekanan osmotik.",
            "Tekanan hidrostatik, tekanan osmotik, tegangan permukaan, dan indeks bias.",
            "Kenaikan tekanan uap, penurunan titik didih, tekanan osmosis, dan kapasitas kalor."
        ],
        "answer": 2,
        "explanation": "Ada empat sifat koligatif larutan dasar: Penurunan Tekanan Uap (ΔP), Kenaikan Titik Didih (ΔTb), Penurunan Titik Beku (ΔTf), dan Tekanan Osmotik (Π).",
        "topic": "Konsep Dasar",
        "difficulty": "Dasar"
    },
    {
        "question": "Untuk menghindari kelelahan kognitif saat belajar grafik P-T yang rumit, pengembang media kimia disarankan menerapkan 'segmenting' (memecah visualisasi) berdasarkan kaidah...",
        "options": [
            "Teori Asam Basa Lewis",
            "Prinsip Termodinamika Entropi",
            "Hukum Kekekalan Massa Lavoisier",
            "Teori Beban Kognitif (Cognitive Load Theory)",
            "Efek Tyndall pada Koloid"
        ],
        "answer": 3,
        "explanation": "Dalam mendesain pembelajaran materi yang memiliki interaktivitas tinggi seperti diagram P-T, 'segmenting' diterapkan berdasarkan Cognitive Load Theory agar ruang memori kerja (working memory) siswa tidak kelebihan muatan.",
        "topic": "Teori Pembelajaran Kimia",
        "difficulty": "Dasar"
    }
]


def get_db():
    connection = sqlite3.connect(app.config["DATABASE"])
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    connection = get_db()
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'student',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            score INTEGER NOT NULL,
            correct_count INTEGER NOT NULL,
            wrong_count INTEGER NOT NULL,
            blank_count INTEGER NOT NULL,
            duration_seconds INTEGER NOT NULL,
            answers_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        );
        """
    )
    connection.commit()
    connection.close()


def login_required(view_function):
    @wraps(view_function)
    def wrapped_view(*args, **kwargs):
        if "user_id" not in session:
            flash("Silakan login terlebih dahulu untuk mengakses fitur ini.", "warning")
            return redirect(url_for("login"))
        return view_function(*args, **kwargs)

    return wrapped_view


def get_current_user():
    user_id = session.get("user_id")
    if not user_id:
        return None

    connection = get_db()
    user = connection.execute(
        "SELECT id, full_name, email, role, created_at FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()
    connection.close()
    return user


def calculate_result(answers):
    normalized_answers = []
    correct_count = 0
    blank_count = 0
    review_items = []

    for index, question in enumerate(QUIZ_DATA):
        selected = answers[index] if index < len(answers) else None
        selected = selected if isinstance(selected, int) and 0 <= selected < len(question["options"]) else None
        normalized_answers.append(selected)

        if selected is None:
            blank_count += 1
        elif selected == question["answer"]:
            correct_count += 1

        review_items.append(
            {
                "number": index + 1,
                "question": question["question"],
                "topic": question["topic"],
                "difficulty": question["difficulty"],
                "selected": selected,
                "selected_text": None if selected is None else question["options"][selected],
                "correct_answer": question["answer"],
                "correct_text": question["options"][question["answer"]],
                "is_correct": selected == question["answer"],
                "is_blank": selected is None,
                "explanation": question["explanation"],
            }
        )

    total_questions = len(QUIZ_DATA)
    wrong_count = total_questions - correct_count - blank_count
    score = round((correct_count / total_questions) * 100)

    return {
        "answers": normalized_answers,
        "score": score,
        "correct_count": correct_count,
        "wrong_count": wrong_count,
        "blank_count": blank_count,
        "accuracy": round((correct_count / total_questions) * 100),
        "review_items": review_items,
    }


def grade_for_score(score):
    if score >= 90:
        return {
            "label": "A · Sangat Baik",
            "message": "Pemahaman Anda sudah kuat. Tinggal menjaga konsistensi dan ketelitian saat menjawab soal hitungan atau konsep serupa.",
        }
    if score >= 80:
        return {
            "label": "B · Baik",
            "message": "Hasilnya baik dan stabil. Beberapa materi menengah masih bisa dipoles agar lebih mantap.",
        }
    if score >= 70:
        return {
            "label": "C · Cukup",
            "message": "Dasarnya sudah terlihat, tetapi masih ada beberapa konsep yang perlu diperkuat melalui latihan ulang.",
        }
    if score >= 60:
        return {
            "label": "D · Perlu Latihan",
            "message": "Masih perlu latihan yang lebih rutin, terutama pada topik sifat koligatif dan aplikasinya.",
        }
    return {
        "label": "E · Perlu Pendampingan",
        "message": "Mulailah lagi dari konsep paling dasar, lalu gunakan pembahasan pada setiap nomor sebagai bahan belajar.",
    }


@app.context_processor
def inject_global_data():
    return {
        "current_user": get_current_user(),
    }


@app.route("/")
def home():
    return render_template(
        "landing.html",
        total_questions=len(QUIZ_DATA),
        duration_minutes=60,
        topic_count=len({item["topic"] for item in QUIZ_DATA}),
    )


@app.route("/register", methods=["GET", "POST"])
def register():
    if session.get("user_id"):
        return redirect(url_for("dashboard"))

    if request.method == "POST":
        full_name = request.form.get("full_name", "").strip()
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")

        if not full_name or not email or not password:
            flash("Nama, email, dan password wajib diisi.", "error")
            return render_template("auth.html", auth_mode="register")

        connection = get_db()
        existing_user = connection.execute(
            "SELECT id FROM users WHERE email = ?",
            (email,),
        ).fetchone()
        if existing_user:
            connection.close()
            flash("Email sudah terdaftar. Silakan login.", "error")
            return render_template("auth.html", auth_mode="register")

        cursor = connection.execute(
            """
            INSERT INTO users (full_name, email, password_hash, role, created_at)
            VALUES (?, ?, ?, 'student', ?)
            """,
            (full_name, email, generate_password_hash(password), datetime.utcnow().isoformat()),
        )
        connection.commit()
        user_id = cursor.lastrowid
        connection.close()

        session["user_id"] = user_id
        flash("Akun berhasil dibuat. Selamat datang di LabKimia.", "success")
        return redirect(url_for("dashboard"))

    return render_template("auth.html", auth_mode="register")


@app.route("/login", methods=["GET", "POST"])
def login():
    if session.get("user_id"):
        return redirect(url_for("dashboard"))

    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")

        connection = get_db()
        user = connection.execute(
            "SELECT * FROM users WHERE email = ?",
            (email,),
        ).fetchone()
        connection.close()

        if not user or not check_password_hash(user["password_hash"], password):
            flash("Email atau password tidak sesuai.", "error")
            return render_template("auth.html", auth_mode="login")

        session["user_id"] = user["id"]
        flash(f"Selamat datang kembali, {user['full_name']}.", "success")
        return redirect(url_for("dashboard"))

    return render_template("auth.html", auth_mode="login")


@app.route("/logout")
def logout():
    session.clear()
    flash("Anda telah logout.", "success")
    return redirect(url_for("home"))


@app.route("/dashboard")
@login_required
def dashboard():
    user = get_current_user()
    connection = get_db()
    attempts = connection.execute(
        """
        SELECT id, score, correct_count, wrong_count, blank_count, duration_seconds, created_at
        FROM attempts
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT 8
        """,
        (session["user_id"],),
    ).fetchall()
    stats = connection.execute(
        """
        SELECT
            COUNT(*) AS attempt_count,
            COALESCE(MAX(score), 0) AS best_score,
            COALESCE(ROUND(AVG(score)), 0) AS average_score
        FROM attempts
        WHERE user_id = ?
        """,
        (session["user_id"],),
    ).fetchone()
    connection.close()

    completion_rate = 0
    if stats["attempt_count"]:
        completion_rate = round((stats["best_score"] / 100) * 100)

    return render_template(
        "dashboard.html",
        user=user,
        attempts=attempts,
        stats=stats,
        total_questions=len(QUIZ_DATA),
        duration_minutes=60,
        completion_rate=completion_rate,
    )


@app.route("/quiz")
@login_required
def quiz():
    user = get_current_user()
    return render_template(
        "quiz.html",
        quiz_data=QUIZ_DATA,
        duration_minutes=60,
        total_questions=len(QUIZ_DATA),
        user=user,
    )


@app.route("/api/submit-quiz", methods=["POST"])
@login_required
def submit_quiz():
    payload = request.get_json(silent=True) or {}
    answers = payload.get("answers", [])
    duration_seconds = payload.get("duration_seconds", 0)

    if not isinstance(answers, list):
        return jsonify({"error": "Format jawaban tidak valid."}), 400

    result = calculate_result(answers)

    try:
        duration_seconds = int(duration_seconds)
    except (TypeError, ValueError):
        duration_seconds = 0

    connection = get_db()
    cursor = connection.execute(
        """
        INSERT INTO attempts (
            user_id, score, correct_count, wrong_count, blank_count,
            duration_seconds, answers_json, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            session["user_id"],
            result["score"],
            result["correct_count"],
            result["wrong_count"],
            result["blank_count"],
            max(duration_seconds, 0),
            json.dumps(result["answers"]),
            datetime.utcnow().isoformat(),
        ),
    )
    connection.commit()
    attempt_id = cursor.lastrowid
    connection.close()

    return jsonify({"redirect_url": url_for("result_detail", attempt_id=attempt_id)})


@app.route("/results/<int:attempt_id>")
@login_required
def result_detail(attempt_id):
    connection = get_db()
    attempt = connection.execute(
        """
        SELECT id, user_id, score, correct_count, wrong_count, blank_count, duration_seconds, answers_json, created_at
        FROM attempts
        WHERE id = ? AND user_id = ?
        """,
        (attempt_id, session["user_id"]),
    ).fetchone()
    connection.close()

    if not attempt:
        flash("Hasil yang Anda cari tidak ditemukan.", "error")
        return redirect(url_for("dashboard"))

    answers = json.loads(attempt["answers_json"])
    result = calculate_result(answers)
    grade = grade_for_score(attempt["score"])

    return render_template(
        "result.html",
        attempt=attempt,
        grade=grade,
        review_items=result["review_items"],
        accuracy=result["accuracy"],
    )


init_db()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=False)
