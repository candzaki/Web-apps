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
        "question": "Nomor atom suatu unsur menyatakan jumlah ....",
        "difficulty": "Dasar",
        "topic": "Struktur Atom",
        "options": ["Neutron dalam inti", "Elektron pada kulit terluar", "Proton dalam inti", "Nukleon dalam inti"],
        "answer": 2,
        "explanation": "Nomor atom didefinisikan sebagai jumlah proton di dalam inti atom. Pada atom netral jumlah ini sama dengan elektron, tetapi pengertiannya tetap jumlah proton.",
    },
    {
        "question": "Partikel yang bermuatan negatif dalam atom adalah ....",
        "difficulty": "Dasar",
        "topic": "Struktur Atom",
        "options": ["Proton", "Elektron", "Neutron", "Nukleon"],
        "answer": 1,
        "explanation": "Elektron bermuatan negatif, proton bermuatan positif, dan neutron bersifat netral.",
    },
    {
        "question": "Konfigurasi elektron unsur natrium dengan nomor atom 11 adalah ....",
        "difficulty": "Dasar",
        "topic": "Konfigurasi Elektron",
        "options": ["2, 8, 1", "2, 8, 2", "2, 7, 2", "2, 9"],
        "answer": 0,
        "explanation": "Natrium memiliki 11 elektron dengan konfigurasi kulit sederhana 2, 8, 1.",
    },
    {
        "question": "Golongan unsur dalam tabel periodik terutama menunjukkan jumlah ....",
        "difficulty": "Dasar",
        "topic": "Sistem Periodik",
        "options": ["Kulit elektron", "Elektron valensi", "Neutron", "Orbital penuh"],
        "answer": 1,
        "explanation": "Untuk unsur golongan utama, nomor golongan berkaitan dengan jumlah elektron valensi.",
    },
    {
        "question": "Unsur yang cenderung membentuk ion bermuatan positif adalah ....",
        "difficulty": "Dasar",
        "topic": "Ikatan Kimia",
        "options": ["Logam", "Gas mulia", "Halogen", "Metaloid"],
        "answer": 0,
        "explanation": "Logam mudah melepaskan elektron sehingga membentuk kation.",
    },
    {
        "question": "Rumus kimia senyawa yang terbentuk dari ion Ca2+ dan Cl- adalah ....",
        "difficulty": "Dasar",
        "topic": "Ikatan Ion",
        "options": ["CaCl", "CaCl2", "Ca2Cl", "Ca2Cl2"],
        "answer": 1,
        "explanation": "Ion Ca2+ membutuhkan dua ion Cl- agar total muatan menjadi netral sehingga rumusnya CaCl2.",
    },
    {
        "question": "Ikatan yang terjadi karena pemakaian pasangan elektron bersama disebut ....",
        "difficulty": "Menengah",
        "topic": "Ikatan Kovalen",
        "options": ["Ikatan ion", "Ikatan logam", "Ikatan kovalen", "Ikatan hidrogen"],
        "answer": 2,
        "explanation": "Ikatan kovalen terbentuk ketika atom menggunakan pasangan elektron secara bersama-sama.",
    },
    {
        "question": "Senyawa berikut yang tergolong senyawa ion adalah ....",
        "difficulty": "Menengah",
        "topic": "Ikatan Kimia",
        "options": ["H2O", "CO2", "NaCl", "NH3"],
        "answer": 2,
        "explanation": "NaCl merupakan hasil interaksi ion positif Na+ dan ion negatif Cl-.",
    },
    {
        "question": "Asam yang terdapat dalam cuka adalah ....",
        "difficulty": "Dasar",
        "topic": "Asam Basa",
        "options": ["Asam sulfat", "Asam asetat", "Asam klorida", "Asam nitrat"],
        "answer": 1,
        "explanation": "Cuka mengandung asam asetat atau CH3COOH.",
    },
    {
        "question": "Nilai pH larutan netral pada suhu kamar adalah ....",
        "difficulty": "Dasar",
        "topic": "Asam Basa",
        "options": ["0", "5", "7", "14"],
        "answer": 2,
        "explanation": "Larutan netral memiliki pH 7 pada suhu kamar karena konsentrasi H+ dan OH- sama.",
    },
    {
        "question": "Larutan dengan pH kurang dari 7 bersifat ....",
        "difficulty": "Dasar",
        "topic": "Asam Basa",
        "options": ["Basa", "Asam", "Netral", "Garam"],
        "answer": 1,
        "explanation": "pH di bawah 7 menunjukkan suasana asam.",
    },
    {
        "question": "Indikator alami yang dapat digunakan untuk menguji asam dan basa adalah ....",
        "difficulty": "Menengah",
        "topic": "Indikator",
        "options": ["Air mineral", "Ekstrak kubis ungu", "Minyak goreng", "Larutan gula"],
        "answer": 1,
        "explanation": "Kubis ungu mengandung antosianin yang berubah warna tergantung keasaman larutan.",
    },
    {
        "question": "Reaksi antara asam dan basa yang menghasilkan garam dan air disebut reaksi ....",
        "difficulty": "Dasar",
        "topic": "Asam Basa",
        "options": ["Oksidasi", "Reduksi", "Netralisasi", "Disosiasi"],
        "answer": 2,
        "explanation": "Reaksi netralisasi terjadi saat asam bereaksi dengan basa membentuk garam dan air.",
    },
    {
        "question": "Persamaan reaksi yang setara untuk pembentukan air dari hidrogen dan oksigen adalah ....",
        "difficulty": "Menengah",
        "topic": "Persamaan Reaksi",
        "options": ["H2 + O2 -> H2O", "2H2 + O2 -> 2H2O", "H2 + 2O -> H2O", "2H + O2 -> H2O"],
        "answer": 1,
        "explanation": "Persamaan setara harus memiliki jumlah atom yang sama di kedua ruas, yaitu 2H2 + O2 -> 2H2O.",
    },
    {
        "question": "Hukum kekekalan massa dikemukakan oleh ....",
        "difficulty": "Menengah",
        "topic": "Hukum Dasar Kimia",
        "options": ["John Dalton", "Lavoisier", "Avogadro", "Mendeleev"],
        "answer": 1,
        "explanation": "Lavoisier menyatakan bahwa massa total zat sebelum dan sesudah reaksi dalam sistem tertutup tetap.",
    },
    {
        "question": "Menurut teori tumbukan, laju reaksi akan bertambah jika ....",
        "difficulty": "Menengah",
        "topic": "Laju Reaksi",
        "options": ["Jumlah tumbukan efektif berkurang", "Energi aktivasi diperbesar", "Jumlah tumbukan efektif meningkat", "Konsentrasi diperkecil"],
        "answer": 2,
        "explanation": "Semakin banyak tumbukan efektif, semakin cepat laju reaksi.",
    },
    {
        "question": "Katalis berfungsi untuk ....",
        "difficulty": "Menengah",
        "topic": "Laju Reaksi",
        "options": ["Menurunkan hasil reaksi", "Meningkatkan energi aktivasi", "Mempercepat reaksi tanpa habis bereaksi", "Mengubah massa zat"],
        "answer": 2,
        "explanation": "Katalis mempercepat reaksi dengan menurunkan energi aktivasi dan tidak habis secara permanen.",
    },
    {
        "question": "Jika konsentrasi pereaksi dinaikkan, maka laju reaksi umumnya ....",
        "difficulty": "Dasar",
        "topic": "Laju Reaksi",
        "options": ["Menurun", "Tetap", "Meningkat", "Menjadi nol"],
        "answer": 2,
        "explanation": "Konsentrasi lebih tinggi memperbesar peluang tumbukan efektif antar partikel.",
    },
    {
        "question": "Dalam reaksi redoks, oksidasi adalah peristiwa ....",
        "difficulty": "Menengah",
        "topic": "Redoks",
        "options": ["Penerimaan elektron", "Pelepasan elektron", "Penurunan bilangan oksidasi", "Pembentukan endapan"],
        "answer": 1,
        "explanation": "Oksidasi berarti pelepasan elektron atau kenaikan bilangan oksidasi.",
    },
    {
        "question": "Bilangan oksidasi unsur bebas, seperti O2 atau Fe, adalah ....",
        "difficulty": "Menengah",
        "topic": "Redoks",
        "options": ["-2", "0", "+1", "+2"],
        "answer": 1,
        "explanation": "Setiap unsur bebas memiliki bilangan oksidasi 0.",
    },
    {
        "question": "Larutan yang dapat menghantarkan arus listrik dengan baik adalah ....",
        "difficulty": "Menengah",
        "topic": "Elektrolit",
        "options": ["Larutan gula", "Larutan urea", "Larutan NaCl", "Air murni"],
        "answer": 2,
        "explanation": "NaCl terionisasi dalam air sehingga menghasilkan ion bergerak bebas yang menghantarkan listrik.",
    },
    {
        "question": "Proses pelapisan logam menggunakan arus listrik disebut ....",
        "difficulty": "Menengah",
        "topic": "Elektrokimia",
        "options": ["Elektrolisis", "Distilasi", "Sublimasi", "Kondensasi"],
        "answer": 0,
        "explanation": "Pelapisan logam termasuk penerapan elektrolisis.",
    },
    {
        "question": "Contoh perubahan kimia adalah ....",
        "difficulty": "Dasar",
        "topic": "Perubahan Materi",
        "options": ["Es mencair", "Air menguap", "Besi berkarat", "Garam larut dalam air"],
        "answer": 2,
        "explanation": "Besi berkarat menghasilkan zat baru sehingga termasuk perubahan kimia.",
    },
    {
        "question": "Rumus molekul karbon dioksida adalah ....",
        "difficulty": "Dasar",
        "topic": "Senyawa Kimia",
        "options": ["CO", "CO2", "C2O", "C2O2"],
        "answer": 1,
        "explanation": "Karbon dioksida tersusun dari satu atom karbon dan dua atom oksigen, yaitu CO2.",
    },
    {
        "question": "Unsur utama penyusun gas alam adalah ....",
        "difficulty": "Menengah",
        "topic": "Hidrokarbon",
        "options": ["Metana", "Etanol", "Bensin", "Butanol"],
        "answer": 0,
        "explanation": "Gas alam didominasi oleh metana atau CH4.",
    },
    {
        "question": "Polimer alami berikut adalah ....",
        "difficulty": "Menengah",
        "topic": "Polimer",
        "options": ["PVC", "Nilon", "Selulosa", "Teflon"],
        "answer": 2,
        "explanation": "Selulosa adalah polimer alami utama penyusun dinding sel tumbuhan.",
    },
    {
        "question": "Unsur transisi memiliki ciri umum yaitu ....",
        "difficulty": "Lanjutan",
        "topic": "Unsur Transisi",
        "options": ["Selalu tidak berwarna", "Memiliki orbital d yang belum penuh", "Hanya membentuk anion", "Tidak dapat menjadi katalis"],
        "answer": 1,
        "explanation": "Unsur transisi dicirikan oleh subkulit d yang belum penuh pada atom atau ionnya.",
    },
    {
        "question": "Pada reaksi 2Mg + O2 -> 2MgO, magnesium mengalami ....",
        "difficulty": "Menengah",
        "topic": "Redoks",
        "options": ["Reduksi", "Oksidasi", "Netralisasi", "Hidrolisis"],
        "answer": 1,
        "explanation": "Magnesium melepaskan elektron untuk membentuk Mg2+ sehingga mengalami oksidasi.",
    },
    {
        "question": "Jika 1 mol zat mengandung 6,02 x 10^23 partikel, maka bilangan tersebut disebut bilangan ....",
        "difficulty": "Dasar",
        "topic": "Mol",
        "options": ["Faraday", "Pascal", "Avogadro", "Boyle"],
        "answer": 2,
        "explanation": "Bilangan Avogadro menyatakan jumlah partikel dalam 1 mol zat.",
    },
    {
        "question": "Massa molar H2O adalah ....",
        "difficulty": "Menengah",
        "topic": "Stoikiometri",
        "options": ["16 g/mol", "18 g/mol", "20 g/mol", "22 g/mol"],
        "answer": 1,
        "explanation": "Massa molar air dihitung dari 2(1) + 16 = 18 g/mol.",
    },
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
            "message": "Masih perlu latihan yang lebih rutin, terutama pada topik redoks, stoikiometri, dan laju reaksi.",
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
        duration_minutes=45,
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
        duration_minutes=45,
        completion_rate=completion_rate,
    )


@app.route("/quiz")
@login_required
def quiz():
    user = get_current_user()
    return render_template(
        "quiz.html",
        quiz_data=QUIZ_DATA,
        duration_minutes=45,
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
