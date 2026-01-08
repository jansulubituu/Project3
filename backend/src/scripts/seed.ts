/**
 * Database Seed Script
 * 
 * Tạo dữ liệu mẫu cho tất cả collections
 * 
 * Usage:
 *   npm run seed          - Seed all data
 *   npm run seed:destroy  - Delete all data
 */

import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import {
  User,
  Category,
  Course,
  Section,
  Lesson,
  Enrollment,
  Progress,
  Review,
  Payment,
  Notification,
  Question,
  Exam,
  ExamAttempt,
  ExamTemplate,
  AiGenerationJob,
  AiPromptTemplate,
} from '../models';

// Load environment variables
dotenv.config();

// Sample data
const sampleUsers = [
  {
    email: 'admin@edulearn.com',
    password: 'Admin123!',
    fullName: 'Admin User',
    role: 'admin',
    avatar: 'https://i.pravatar.cc/150?img=1',
    isEmailVerified: true,
    isActive: true,
  },
  {
    email: 'instructor@edulearn.com',
    password: 'Instructor123!',
    fullName: 'John Smith',
    role: 'instructor',
    avatar: 'https://i.pravatar.cc/150?img=12',
    bio: 'Experienced full-stack developer with 10+ years in web development',
    headline: 'Senior Full Stack Developer',
    website: 'https://johnsmith.dev',
    social: {
      linkedin: 'https://linkedin.com/in/johnsmith',
      twitter: 'https://twitter.com/johnsmith',
    },
    isEmailVerified: true,
    isActive: true,
  },
  {
    email: 'instructor2@edulearn.com',
    password: 'Instructor123!',
    fullName: 'Sarah Johnson',
    role: 'instructor',
    avatar: 'https://i.pravatar.cc/150?img=5',
    bio: 'UI/UX Designer & Frontend Developer',
    headline: 'Senior UI/UX Designer',
    isEmailVerified: true,
    isActive: true,
  },
  {
    email: 'student@edulearn.com',
    password: 'Student123!',
    fullName: 'Jane Doe',
    role: 'student',
    avatar: 'https://i.pravatar.cc/150?img=9',
    bio: 'Aspiring web developer',
    isEmailVerified: true,
    isActive: true,
  },
  {
    email: 'student2@edulearn.com',
    password: 'Student123!',
    fullName: 'Mike Wilson',
    role: 'student',
    avatar: 'https://i.pravatar.cc/150?img=11',
    isEmailVerified: true,
    isActive: true,
  },
];

const sampleCategories = [
  {
    name: 'Web Development',
    slug: 'web-development',
    description: 'Learn to build modern websites and web applications',
    icon: '💻',
    order: 1,
    isActive: true,
  },
  {
    name: 'Mobile Development',
    slug: 'mobile-development',
    description: 'Create mobile apps for iOS and Android',
    icon: '📱',
    order: 2,
    isActive: true,
  },
  {
    name: 'Data Science',
    slug: 'data-science',
    description: 'Master data analysis and machine learning',
    icon: '📊',
    order: 3,
    isActive: true,
  },
  {
    name: 'Design',
    slug: 'design',
    description: 'UI/UX design and graphic design courses',
    icon: '🎨',
    order: 4,
    isActive: true,
  },
];

// Seed function
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seed...\n');

    // Connect to database
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined');
    }
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB Connected\n');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Category.deleteMany({});
    await Course.deleteMany({});
    await Section.deleteMany({});
    await Lesson.deleteMany({});
    await Enrollment.deleteMany({});
    await Progress.deleteMany({});
    await Review.deleteMany({});
    await Payment.deleteMany({});
    await Notification.deleteMany({});
    await Exam.deleteMany({});
    await ExamAttempt.deleteMany({});
    await Question.deleteMany({});
    await ExamTemplate.deleteMany({});
    await AiGenerationJob.deleteMany({});
    await AiPromptTemplate.deleteMany({});
    console.log('✅ Cleared all collections\n');

    // Seed Users
    console.log('👥 Creating users...');
    const users = await User.create(sampleUsers);
    console.log(`✅ Created ${users.length} users`);

    const instructor1 = users.find((u) => u.email === 'instructor@edulearn.com')!;
    const instructor2 = users.find((u) => u.email === 'instructor2@edulearn.com')!;
    const student1 = users.find((u) => u.email === 'student@edulearn.com')!;
    const student2 = users.find((u) => u.email === 'student2@edulearn.com')!;

    // Seed Categories
    console.log('\n📁 Creating categories...');
    const categories = await Category.create(sampleCategories);
    console.log(`✅ Created ${categories.length} categories`);

    const webDevCategory = categories.find((c) => c.slug === 'web-development')!;
    const designCategory = categories.find((c) => c.slug === 'design')!;

    // Seed Courses
    console.log('\n📚 Creating courses...');
    const sampleCourses = [
      {
        title: 'Complete React Developer Course',
        slug: 'complete-react-developer-course',
        description:
          'Master React by building real-world projects. Learn hooks, context, Redux, and more.',
        shortDescription: 'Learn React from scratch with hands-on projects',
        instructor: instructor1._id,
        category: webDevCategory._id,
        level: 'beginner',
        thumbnail: 'https://picsum.photos/seed/react/400/300',
        price: 99.99,
        discountPrice: 49.99,
        currency: 'USD',
        language: 'English',
        requirements: ['Basic JavaScript knowledge', 'HTML & CSS basics'],
        learningOutcomes: [
          'Build React applications from scratch',
          'Master React Hooks and Context API',
          'Implement state management with Redux',
          'Create responsive and interactive UIs',
        ],
        targetAudience: ['Beginner web developers', 'JavaScript developers'],
        tags: ['react', 'javascript', 'frontend', 'web development'],
        status: 'published',
        isPublished: true,
        publishedAt: new Date(),
      },
      {
        title: 'Modern UI/UX Design Masterclass',
        slug: 'modern-ui-ux-design-masterclass',
        description:
          'Learn professional UI/UX design principles and create stunning user interfaces.',
        shortDescription: 'Master UI/UX design from industry experts',
        instructor: instructor2._id,
        category: designCategory._id,
        level: 'intermediate',
        thumbnail: 'https://picsum.photos/seed/design/400/300',
        price: 79.99,
        discountPrice: 39.99,
        currency: 'USD',
        language: 'English',
        requirements: ['Basic design knowledge', 'Figma or Adobe XD'],
        learningOutcomes: [
          'Create professional UI designs',
          'Understand UX principles',
          'Master design tools',
          'Build design systems',
        ],
        targetAudience: ['Aspiring designers', 'Developers learning design'],
        tags: ['ui', 'ux', 'design', 'figma'],
        status: 'published',
        isPublished: true,
        publishedAt: new Date(),
      },
      {
        title: 'Full Stack Web Development Bootcamp',
        slug: 'full-stack-web-development-bootcamp',
        description:
          'Complete bootcamp covering frontend and backend development with modern technologies.',
        shortDescription: 'Become a full-stack developer',
        instructor: instructor1._id,
        category: webDevCategory._id,
        level: 'all_levels',
        thumbnail: 'https://picsum.photos/seed/fullstack/400/300',
        price: 149.99,
        currency: 'USD',
        language: 'English',
        requirements: ['No prior experience required'],
        learningOutcomes: [
          'Build full-stack applications',
          'Master frontend and backend',
          'Deploy to production',
          'Work with databases',
        ],
        targetAudience: ['Complete beginners', 'Career changers'],
        tags: ['fullstack', 'nodejs', 'react', 'mongodb'],
        status: 'published',
        isPublished: true,
        publishedAt: new Date(),
      },
    ];

    const courses = await Course.create(sampleCourses);
    console.log(`✅ Created ${courses.length} courses`);

    const reactCourse = courses[0];
    const designCourse = courses[1];

    // Seed Sections & Lessons for React Course
    console.log('\n📖 Creating sections and lessons...');

    const reactSections = await Section.create([
      {
        course: reactCourse._id,
        title: 'Introduction to React',
        description: 'Get started with React fundamentals',
        order: 1,
      },
      {
        course: reactCourse._id,
        title: 'React Hooks Deep Dive',
        description: 'Master useState, useEffect, and custom hooks',
        order: 2,
      },
      {
        course: reactCourse._id,
        title: 'State Management',
        description: 'Learn Context API and Redux',
        order: 3,
      },
    ]);

    const reactLessons = await Lesson.create([
      {
        section: reactSections[0]._id,
        course: reactCourse._id,
        title: 'Welcome to the Course',
        description: 'Course overview and what you will learn',
        type: 'video',
        videoUrl: 'https://example.com/video1.mp4',
        videoDuration: 300,
        order: 1,
        isFree: true,
        isPublished: true,
      },
      {
        section: reactSections[0]._id,
        course: reactCourse._id,
        title: 'What is React?',
        description: 'Introduction to React library',
        type: 'video',
        videoUrl: 'https://example.com/video2.mp4',
        videoDuration: 600,
        order: 2,
        isFree: true,
        isPublished: true,
      },
      {
        section: reactSections[0]._id,
        course: reactCourse._id,
        title: 'Setting Up Development Environment',
        description: 'Install Node.js, npm, and create React app',
        type: 'article',
        articleContent: '<h2>Setup Guide</h2><p>Follow these steps...</p>',
        order: 3,
        duration: 10,
        isPublished: true,
      },
      {
        section: reactSections[1]._id,
        course: reactCourse._id,
        title: 'Understanding useState Hook',
        description: 'Learn how to manage state in functional components',
        type: 'video',
        videoUrl: 'https://example.com/video3.mp4',
        videoDuration: 900,
        order: 1,
        isPublished: true,
      },
      {
        section: reactSections[1]._id,
        course: reactCourse._id,
        title: 'Quiz: React Hooks Basics',
        description: 'Test your knowledge of React hooks',
        type: 'quiz',
        quizQuestions: [
          {
            question: 'What is the purpose of useState hook?',
            type: 'multiple_choice',
            options: [
              'To manage component state',
              'To fetch data',
              'To handle side effects',
              'To create components',
            ],
            correctAnswer: 'To manage component state',
            explanation: 'useState is used to add state to functional components',
            points: 10,
          },
        ],
        order: 2,
        duration: 15,
        isPublished: true,
      },
    ]);

    console.log(`✅ Created ${reactSections.length} sections`);
    console.log(`✅ Created ${reactLessons.length} lessons`);

    // Update section statistics manually
    for (const section of reactSections) {
      const lessons = await Lesson.find({ section: section._id });
      section.lessonCount = lessons.length;
      section.duration = lessons.reduce((total, lesson) => total + (lesson.duration || 0), 0);
      await section.save();
    }

    // Update course statistics
    const allSections = await Section.find({ course: reactCourse._id });
    reactCourse.totalDuration = allSections.reduce((total, section) => total + section.duration, 0);
    reactCourse.totalLessons = allSections.reduce((total, section) => total + section.lessonCount, 0);
    await reactCourse.save();

    // Seed Questions (Question Bank)
    console.log('\n❓ Creating questions (Question Bank)...');
    const questions = await Question.create([
      // Single choice questions
      {
        course: reactCourse._id,
        section: reactSections[0]._id,
        owner: instructor1._id,
        type: 'single_choice',
        difficulty: 'easy',
        text: 'What is React?',
        options: [
          { id: 'a', text: 'A JavaScript library for building user interfaces', isCorrect: true },
          { id: 'b', text: 'A database management system', isCorrect: false },
          { id: 'c', text: 'A CSS framework', isCorrect: false },
          { id: 'd', text: 'A server-side framework', isCorrect: false },
        ],
        points: 1,
        negativeMarking: false,
        tags: ['react', 'basics', 'introduction'],
        topic: 'React Fundamentals',
        cognitiveLevel: 'remember',
        isActive: true,
        version: 1,
      },
      {
        course: reactCourse._id,
        section: reactSections[0]._id,
        owner: instructor1._id,
        type: 'single_choice',
        difficulty: 'medium',
        text: 'What is JSX?',
        options: [
          { id: 'a', text: 'A JavaScript extension that allows HTML-like syntax', isCorrect: true },
          { id: 'b', text: 'A templating engine', isCorrect: false },
          { id: 'c', text: 'A CSS preprocessor', isCorrect: false },
          { id: 'd', text: 'A database query language', isCorrect: false },
        ],
        points: 1,
        negativeMarking: false,
        tags: ['react', 'jsx', 'syntax'],
        topic: 'React Fundamentals',
        cognitiveLevel: 'understand',
        isActive: true,
        version: 1,
      },
      // Multiple choice questions
      {
        course: reactCourse._id,
        section: reactSections[1]._id,
        owner: instructor1._id,
        type: 'multiple_choice',
        difficulty: 'medium',
        text: 'Which of the following are React Hooks? (Select all that apply)',
        options: [
          { id: 'a', text: 'useState', isCorrect: true },
          { id: 'b', text: 'useEffect', isCorrect: true },
          { id: 'c', text: 'useContext', isCorrect: true },
          { id: 'd', text: 'useClass', isCorrect: false },
        ],
        points: 2,
        negativeMarking: false,
        tags: ['react', 'hooks', 'state'],
        topic: 'React Hooks',
        cognitiveLevel: 'remember',
        isActive: true,
        version: 1,
      },
      {
        course: reactCourse._id,
        section: reactSections[1]._id,
        owner: instructor1._id,
        type: 'multiple_choice',
        difficulty: 'hard',
        text: 'What are the benefits of using React Hooks? (Select all that apply)',
        options: [
          { id: 'a', text: 'Reusable stateful logic', isCorrect: true },
          { id: 'b', text: 'Simpler component code', isCorrect: true },
          { id: 'c', text: 'Better performance', isCorrect: false },
          { id: 'd', text: 'No need for classes', isCorrect: true },
        ],
        points: 3,
        negativeMarking: true,
        negativePoints: 1,
        tags: ['react', 'hooks', 'benefits'],
        topic: 'React Hooks',
        cognitiveLevel: 'analyze',
        isActive: true,
        version: 1,
      },
      // Short answer questions
      {
        course: reactCourse._id,
        section: reactSections[2]._id,
        owner: instructor1._id,
        type: 'short_answer',
        difficulty: 'medium',
        text: 'What is the purpose of the Context API in React?',
        expectedAnswers: ['state management', 'sharing data', 'avoiding prop drilling', 'global state'],
        caseSensitive: false,
        points: 2,
        negativeMarking: false,
        tags: ['react', 'context', 'state-management'],
        topic: 'State Management',
        cognitiveLevel: 'understand',
        isActive: true,
        version: 1,
      },
      {
        course: reactCourse._id,
        section: reactSections[2]._id,
        owner: instructor1._id,
        type: 'short_answer',
        difficulty: 'hard',
        text: 'Name two differences between Redux and Context API.',
        expectedAnswers: [
          'redux has middleware, context does not',
          'redux has devtools, context does not',
          'redux is for complex state, context for simple',
          'redux has time travel debugging',
        ],
        caseSensitive: false,
        points: 3,
        negativeMarking: false,
        tags: ['react', 'redux', 'context', 'state-management'],
        topic: 'State Management',
        cognitiveLevel: 'analyze',
        isActive: true,
        version: 1,
      },
      // Questions for design course
      {
        course: designCourse._id,
        owner: instructor2._id,
        type: 'single_choice',
        difficulty: 'easy',
        text: 'What does UI stand for?',
        options: [
          { id: 'a', text: 'User Interface', isCorrect: true },
          { id: 'b', text: 'User Interaction', isCorrect: false },
          { id: 'c', text: 'User Integration', isCorrect: false },
          { id: 'd', text: 'User Information', isCorrect: false },
        ],
        points: 1,
        negativeMarking: false,
        tags: ['ui', 'basics', 'terminology'],
        topic: 'UI Fundamentals',
        cognitiveLevel: 'remember',
        isActive: true,
        version: 1,
      },
      {
        course: designCourse._id,
        owner: instructor2._id,
        type: 'single_choice',
        difficulty: 'medium',
        text: 'What is the primary goal of UX design?',
        options: [
          { id: 'a', text: 'To make products beautiful', isCorrect: false },
          { id: 'b', text: 'To create a positive user experience', isCorrect: true },
          { id: 'c', text: 'To use the latest design trends', isCorrect: false },
          { id: 'd', text: 'To minimize development costs', isCorrect: false },
        ],
        points: 2,
        negativeMarking: false,
        tags: ['ux', 'design-principles'],
        topic: 'UX Principles',
        cognitiveLevel: 'understand',
        isActive: true,
        version: 1,
      },
    ]);
    console.log(`✅ Created ${questions.length} questions`);

    // Seed Exam Templates
    console.log('\n📋 Creating exam templates...');
    const examTemplates = await ExamTemplate.create([
      {
        course: reactCourse._id,
        section: reactSections[0]._id,
        title: 'React Fundamentals Quiz Template',
        description: 'Template for basic React knowledge assessment',
        numberOfQuestions: 5,
        difficultyDistribution: [
          { level: 'easy', ratio: 40 },
          { level: 'medium', ratio: 50 },
          { level: 'hard', ratio: 10 },
        ],
        typeDistribution: [
          { type: 'single_choice', ratio: 60 },
          { type: 'multiple_choice', ratio: 30 },
          { type: 'short_answer', ratio: 10 },
        ],
        shuffleQuestions: true,
        shuffleAnswers: true,
        createdBy: instructor1._id,
        isActive: true,
      },
      {
        course: reactCourse._id,
        title: 'Complete React Course Final Exam Template',
        description: 'Comprehensive exam covering all course topics',
        numberOfQuestions: 20,
        difficultyDistribution: [
          { level: 'easy', ratio: 20 },
          { level: 'medium', ratio: 50 },
          { level: 'hard', ratio: 30 },
        ],
        typeDistribution: [
          { type: 'single_choice', ratio: 50 },
          { type: 'multiple_choice', ratio: 30 },
          { type: 'short_answer', ratio: 20 },
        ],
        shuffleQuestions: true,
        shuffleAnswers: true,
        createdBy: instructor1._id,
        isActive: true,
      },
    ]);
    console.log(`✅ Created ${examTemplates.length} exam templates`);

    // Seed Exams
    console.log('\n📝 Creating exams...');
    const exams = await Exam.create([
      {
        course: reactCourse._id,
        section: reactSections[0]._id,
        title: 'React Fundamentals Quiz',
        description: 'Test your understanding of React basics',
        slug: `react-fundamentals-quiz-${Date.now()}`,
        status: 'published',
        questions: [
          { question: questions[0]._id, order: 1, weight: 1 },
          { question: questions[1]._id, order: 2, weight: 1 },
        ],
        totalPoints: 2,
        passingScore: 1,
        shuffleQuestions: true,
        shuffleAnswers: true,
        openAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        closeAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        durationMinutes: 30,
        maxAttempts: 3,
        scoringMethod: 'highest',
        showCorrectAnswers: 'after_submit',
        showScoreToStudent: true,
        allowLateSubmission: false,
        latePenaltyPercent: 0,
        timeLimitType: 'per_attempt',
        createdBy: instructor1._id,
      },
      {
        course: reactCourse._id,
        title: 'React Course Final Exam',
        description: 'Comprehensive final examination covering all course topics',
        slug: `react-final-exam-${Date.now()}`,
        status: 'draft',
        questions: [
          { question: questions[0]._id, order: 1, weight: 1 },
          { question: questions[1]._id, order: 2, weight: 1 },
          { question: questions[2]._id, order: 3, weight: 2 },
          { question: questions[3]._id, order: 4, weight: 3 },
          { question: questions[4]._id, order: 5, weight: 2 },
          { question: questions[5]._id, order: 6, weight: 3 },
        ],
        totalPoints: 12,
        passingScore: 7,
        shuffleQuestions: true,
        shuffleAnswers: true,
        openAt: null,
        closeAt: null,
        durationMinutes: 120,
        maxAttempts: 2,
        scoringMethod: 'highest',
        showCorrectAnswers: 'after_close',
        showScoreToStudent: true,
        allowLateSubmission: true,
        latePenaltyPercent: 10,
        timeLimitType: 'per_attempt',
        createdBy: instructor1._id,
      },
      {
        course: designCourse._id,
        title: 'UI/UX Design Basics Quiz',
        description: 'Test your knowledge of UI/UX design fundamentals',
        slug: `ui-ux-basics-quiz-${Date.now()}`,
        status: 'published',
        questions: [
          { question: questions[6]._id, order: 1, weight: 1 },
          { question: questions[7]._id, order: 2, weight: 2 },
        ],
        totalPoints: 3,
        passingScore: 2,
        shuffleQuestions: false,
        shuffleAnswers: true,
        openAt: new Date(),
        closeAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
        durationMinutes: 20,
        maxAttempts: null, // Unlimited
        scoringMethod: 'latest',
        showCorrectAnswers: 'after_submit',
        showScoreToStudent: true,
        allowLateSubmission: false,
        latePenaltyPercent: 0,
        timeLimitType: 'per_attempt',
        createdBy: instructor2._id,
      },
    ]);
    console.log(`✅ Created ${exams.length} exams`);

    // Seed AI Prompt Templates
    console.log('\n🤖 Creating AI prompt templates...');
    const promptTemplates = await AiPromptTemplate.create([
      {
        name: 'Basic Quiz Generator',
        description: 'Generate a basic quiz with multiple choice questions',
        prompt: 'Generate {numberOfQuestions} multiple choice questions about {topic}. Each question should have 4 options with one correct answer. Include explanations for each answer.',
        variables: ['numberOfQuestions', 'topic'],
        createdBy: instructor1._id,
        isActive: true,
      },
      {
        name: 'Comprehensive Exam Generator',
        description: 'Generate a comprehensive exam with mixed question types',
        prompt: 'Create a comprehensive exam with {numberOfQuestions} questions covering {topics}. Include single choice, multiple choice, and short answer questions. Difficulty should be distributed as: {difficultyDistribution}.',
        variables: ['numberOfQuestions', 'topics', 'difficultyDistribution'],
        createdBy: instructor1._id,
        isActive: true,
      },
      {
        name: 'Practice Quiz Generator',
        description: 'Generate practice questions for students',
        prompt: 'Generate practice questions for {courseName}. Focus on {focusArea}. Include detailed explanations for each answer to help students learn.',
        variables: ['courseName', 'focusArea'],
        createdBy: instructor2._id,
        isActive: true,
      },
    ]);
    console.log(`✅ Created ${promptTemplates.length} AI prompt templates`);

    // Seed Enrollments
    console.log('\n🎓 Creating enrollments...');
    const enrollments = await Enrollment.create([
      {
        student: student1._id,
        course: reactCourse._id,
        enrolledAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        status: 'active',
        totalLessons: reactLessons.length,
      },
      {
        student: student2._id,
        course: reactCourse._id,
        enrolledAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        status: 'active',
        totalLessons: reactLessons.length,
      },
      {
        student: student1._id,
        course: designCourse._id,
        enrolledAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        status: 'active',
      },
    ]);
    console.log(`✅ Created ${enrollments.length} enrollments`);

    // Seed Progress
    console.log('\n📊 Creating progress records...');
    const progressRecords = await Progress.create([
      {
        enrollment: enrollments[0]._id,
        student: student1._id,
        lesson: reactLessons[0]._id,
        course: reactCourse._id,
        status: 'completed',
        watchedDuration: 300,
        timeSpent: 5,
        completedAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
      },
      {
        enrollment: enrollments[0]._id,
        student: student1._id,
        lesson: reactLessons[1]._id,
        course: reactCourse._id,
        status: 'completed',
        watchedDuration: 600,
        timeSpent: 10,
        completedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
      },
      {
        enrollment: enrollments[0]._id,
        student: student1._id,
        lesson: reactLessons[2]._id,
        course: reactCourse._id,
        status: 'in_progress',
        timeSpent: 5,
      },
    ]);
    console.log(`✅ Created ${progressRecords.length} progress records`);

    // Seed Reviews
    console.log('\n⭐ Creating reviews...');
    const reviews = await Review.create([
      {
        course: reactCourse._id,
        student: student1._id,
        enrollment: enrollments[0]._id,
        rating: 5,
        comment: 'Excellent course! Very well explained and easy to follow.',
        isPublished: true,
        helpfulCount: 5,
      },
      {
        course: reactCourse._id,
        student: student2._id,
        enrollment: enrollments[1]._id,
        rating: 4,
        comment: 'Great content, but could use more real-world examples.',
        isPublished: true,
        helpfulCount: 2,
      },
    ]);
    console.log(`✅ Created ${reviews.length} reviews`);

    // Recalculate course ratings manually
    const allReviews = await Review.find({ course: reactCourse._id, isPublished: true });
    if (allReviews.length > 0) {
      const avgRating = allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length;
      reactCourse.averageRating = Math.round(avgRating * 10) / 10;
      reactCourse.totalReviews = allReviews.length;
      await reactCourse.save();
    }

    // Seed Payments
    console.log('\n💳 Creating payments...');
    const payments = await Payment.create([
      {
        user: student1._id,
        course: reactCourse._id,
        amount: 99.99,
        discountAmount: 50,
        finalAmount: 49.99,
        currency: 'USD',
        paymentMethod: 'stripe',
        paymentIntent: 'pi_' + Math.random().toString(36).substr(2, 9),
        status: 'completed',
        paidAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
      {
        user: student2._id,
        course: reactCourse._id,
        amount: 99.99,
        discountAmount: 50,
        finalAmount: 49.99,
        currency: 'USD',
        paymentMethod: 'stripe',
        paymentIntent: 'pi_' + Math.random().toString(36).substr(2, 9),
        status: 'completed',
        paidAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      },
    ]);
    console.log(`✅ Created ${payments.length} payments`);

    // Seed Notifications
    console.log('\n🔔 Creating notifications...');
    const notifications = await Notification.create([
      {
        user: student1._id,
        type: 'enrollment',
        title: 'Course Enrollment Successful',
        message: 'You have successfully enrolled in Complete React Developer Course',
        link: `/courses/${reactCourse.slug}`,
        isRead: true,
        readAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
      },
      {
        user: student1._id,
        type: 'course_update',
        title: 'New Lesson Added',
        message: 'A new lesson has been added to your enrolled course',
        link: `/courses/${reactCourse.slug}`,
        isRead: false,
      },
    ]);
    console.log(`✅ Created ${notifications.length} notifications`);

    console.log('\n✨ Database seeded successfully!\n');
    console.log('📊 Summary:');
    console.log(`   Users: ${users.length}`);
    console.log(`   Categories: ${categories.length}`);
    console.log(`   Courses: ${courses.length}`);
    console.log(`   Sections: ${reactSections.length}`);
    console.log(`   Lessons: ${reactLessons.length}`);
    console.log(`   Questions: ${questions.length}`);
    console.log(`   Exam Templates: ${examTemplates.length}`);
    console.log(`   Exams: ${exams.length}`);
    console.log(`   AI Prompt Templates: ${promptTemplates.length}`);
    console.log(`   Enrollments: ${enrollments.length}`);
    console.log(`   Progress: ${progressRecords.length}`);
    console.log(`   Reviews: ${reviews.length}`);
    console.log(`   Payments: ${payments.length}`);
    console.log(`   Notifications: ${notifications.length}`);
    console.log('\n🔐 Test Credentials:');
    console.log('   Admin: admin@edulearn.com / Admin123!');
    console.log('   Instructor: instructor@edulearn.com / Instructor123!');
    console.log('   Student: student@edulearn.com / Student123!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Destroy function
const destroyData = async () => {
  try {
    console.log('🗑️  Destroying all data...\n');

    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined');
    }
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB Connected\n');

    await User.deleteMany({});
    await Category.deleteMany({});
    await Course.deleteMany({});
    await Section.deleteMany({});
    await Lesson.deleteMany({});
    await Enrollment.deleteMany({});
    await Progress.deleteMany({});
    await Review.deleteMany({});
    await Payment.deleteMany({});
    await Notification.deleteMany({});
    await Exam.deleteMany({});
    await ExamAttempt.deleteMany({});
    await Question.deleteMany({});
    await ExamTemplate.deleteMany({});
    await AiGenerationJob.deleteMany({});
    await AiPromptTemplate.deleteMany({});

    console.log('✅ All data destroyed!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error destroying data:', error);
    process.exit(1);
  }
};

// Run based on command line argument
if (process.argv[2] === '-d' || process.argv[2] === '--destroy') {
  destroyData();
} else {
  seedDatabase();
}

