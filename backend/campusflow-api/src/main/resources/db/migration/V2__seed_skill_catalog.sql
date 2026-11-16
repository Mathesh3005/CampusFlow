INSERT INTO skills (name) VALUES
    ('Java'), ('Python'), ('JavaScript'), ('TypeScript'), ('C'), ('C++'), ('C#'),
    ('HTML'), ('CSS'), ('Angular'), ('React'), ('Node.js'), ('Spring Boot'),
    ('SQL'), ('PostgreSQL'), ('MySQL'), ('MongoDB'), ('Git'), ('Docker'),
    ('Kubernetes'), ('AWS'), ('Azure'), ('Machine Learning'), ('Data Analysis'),
    ('Communication'), ('Teamwork'), ('Problem Solving'), ('Leadership')
ON CONFLICT (name) DO NOTHING;
