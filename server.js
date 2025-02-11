import express from "express";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_ACCESS_SECRET || "supersecret";

app.use(express.json());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
 

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
});

// Middleware for authentication
const authenticate = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access denied" });
  try {
    const verified = jwt.verify(token, SECRET_KEY);
    req.user = verified;
    next();
  } catch (error) {
    res.status(400).json({ error: "Invalid token" });
  }
};

{  /** Country Management */
}
app.post("/register/country", authenticate, async (req, res) => {
  const { countryName } = req.body;
  try {
    const country = await prisma.country.create({
      data: { countryName },
    });
    res.status(201).json(country);
  } catch (error) {
    res.status(400).json({ error: `Country registration failed ${error}` });
  }
});

app.get("/list-country", authenticate, async (req, res) => {
  try {
    const country = await prisma.country.findMany();
    res.json(country);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch countries" });
  }
});

{
  /** Role management */
}
app.post("/register/role", authenticate, async (req, res) => {
  const { role } = req.body;
  try {
    const roleRes = await prisma.role.create({
      data: { role },
    });
    res.status(201).json(roleRes);
  } catch (error) {
    res.status(400).json({ error: `Role registration failed ${error}` });
  }
});

app.get("/list-role", authenticate, async (req, res) => {
  try {
    const role = await prisma.role.findMany();
    res.json(role);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch role" });
  }
});

app.get("/category", authenticate, async (req, res) => {
  try {
    const categories = await prisma.ideaCategory.findMany();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

app.get("/role", authenticate, async (req, res) => {
  try {
    const roles = await prisma.role.findMany();
    res.status(201).json(roles);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch role" });
  }
});

app.get("/manager-role", authenticate, async (req, res) => {
  try {
    const roles = await prisma.role.findMany({ where: { roleId: 3 } });
    res.status(201).json(roles);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch role" });
  }
});

app.get("/staff-role", authenticate, async (req, res) => {
  try {
    const roles = await prisma.role.findMany({ where: { roleId: 4 } });
    res.status(201).json(roles);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch role" });
  }
});

// User Registration
app.post("/register/superadmin", async (req, res) => {
  const { email, password, roleId } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.login.create({
      data: { email, password: hashedPassword, roleId },
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: `User registration failed ${error}` });
  }
});

app.post("/register", async (req, res) => {
  const { email, firstName, lastName, roleId } = req.body;
  const hashedPassword = await bcrypt.hash("1234", 10);
  try {
    const member = await prisma.member.create({
      data: { email, firstName, lastName, officeId: 0 },
    });
    const user = await prisma.login.create({
      data: { email, password: hashedPassword, roleId },
    });
    sendRegisterMail(email);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: `User registration failed ${error}` });
  }
});

// User Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.login.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = jwt.sign(
    { userId: user.loginId, roleId: user.roleId },
    SECRET_KEY,
    { expiresIn: "1h" }
  );
  const roleRes = await prisma.role.findFirst({
    where: { roleId: user.roleId },
  });
  const response = { token: token, role: roleRes.role, email: user.email };
  res.json({ response });
});

app.get("/list-admin", authenticate, async (req, res) => {
  try {
    const login = await prisma.login.findMany();
    const adminList = [];
    for (const user of login) {
      if (user.roleId === 2) {
        const admin = await prisma.member.findFirst({
          where: { email: user.email },
        });
        adminList.push(admin);
      }
    }
    res.json(adminList);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

app.get("/list-management", authenticate, async (req, res) => {
  try {
    const login = await prisma.login.findMany();
    const adminList = [];
    for (const user of login) {
      if (user.roleId === 3) {
        const admin = await prisma.member.findFirst({
          where: { email: user.email },
        });
        adminList.push(admin);
      }
    }
    res.json(adminList);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// Get all offices (protected route)
app.post("/offices", authenticate, async (req, res) => {
  try {
    const { name, location, countryId, managerId } = req.body;
    const offices = await prisma.office.create({
      data: { name, location, countryId, managerId },
    });
    res.json(offices);
  } catch (error) {
    res.status(500).json({ error: "Failed to create offices" });
  }
});

app.get("/offices", authenticate, async (req, res) => {
  try {
    const offices = await prisma.office.findMany();
    res.json(offices);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch offices" });
  }
});

{
  /** Idea */
}
app.get("/idea", authenticate, async (req, res) => {
  try {
    const idea_list = [];
    const user_email = req.query["email"];
    const user = await prisma.member.findFirst({
      where: { email: user_email },
    });

    if (user.email === user_email) {
      const ideas = await prisma.idea.findMany({
        where: { memberId: user.memberId },
      });

      for (const idea of ideas) {
        const cat = await prisma.ideaCategory.findFirst({
          where: { catId: idea.catId },
        });
        const votes = await prisma.vote.count({
          where: { ideaId: idea.ideaId },
        });
        if (cat.catId === idea.catId) {
          const ideaObj = {
            ideaId: idea.ideaId,
            title: idea.title,
            description: idea.description,
            category: {
              catId: cat.catId,
              catName: cat.catName,
            },
            status: idea.status,
            member: {
              memberId: user.memberId,
              name: user.firstName + " " + user.lastName,
            },
            existUrl: idea.existUrl,
            date: idea.createdAt,
            likes: votes,
          };
          idea_list.push(ideaObj);
        }
      }
      return res.json(idea_list);
    }
    res.json([]);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch idea" });
  }
});

app.post("/idea", authenticate, async (req, res) => {
  try {
    const { title, description, catId, existUrl, status, email } = req.body;

    if (email != "") {
      const user = await prisma.member.findFirst({ where: { email: email } });
      if (user.memberId != "") {
        const response = await prisma.idea.create({
          data: {
            title,
            description,
            catId,
            existUrl,
            status,
            memberId: user.memberId,
          },
        });
        return res.json(response);
      }
    }
    res.json("");
  } catch (error) {
    res.status(500).json({ error: "Failed to create idea" });
  }
});

app.get("/idea-publish", authenticate, async (req, res) => {
  try {
    const idea_list = [];

    const ideas = await prisma.idea.findMany({
      where: { status: "PUBLISHED" },
    });

    for (const idea of ideas) {
      const user = await prisma.member.findFirst({
        where: { memberId: idea.memberId },
      });

      const cat = await prisma.ideaCategory.findFirst({
        where: { catId: idea.catId },
      });

      const votes = await prisma.vote.count({
        where: { ideaId: idea.ideaId },
      });

      // Load comments with replies
      const comments = await loadComments(idea.ideaId);

      if (cat.catId === idea.catId) {
        const ideaObj = {
          ideaId: idea.ideaId,
          title: idea.title,
          description: idea.description,
          category: {
            catId: cat.catId,
            catName: cat.catName,
          },
          status: idea.status,
          member: {
            memberId: user.memberId,
            name: user.firstName + " " + user.lastName,
          },
          existUrl: idea.existUrl,
          date: idea.createdAt,
          comments: comments, // Fixed comment loading
          likes: votes,
        };
        idea_list.push(ideaObj);
      }
    }
    return res.json(idea_list);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch idea" });
  }
});

app.post("/idea-publish", authenticate, async (req, res) => {
  try {
    const { ideaId } = req.body;
    if (ideaId != "") {
      const response = await prisma.idea.update({
        where: { ideaId: ideaId },
        data: { status: "PUBLISHED" },
      });
      return res.json(response);
    }

    res.json("");
  } catch (error) {
    return res.status(500).json({ error: "Failed to published" });
  }
});

// Recursive function to load comments and replies
async function loadComments(ideaId) {
  const comments = await prisma.comment.findMany({
    where: { ideaId },
  });

  for (const comment of comments) {
    comment.replies = await loadReplies(comment.commentId);
  }

  return comments;
}

// Recursive function to load replies to a comment
async function loadReplies(replyId) {
  if (!replyId) return [];

  const replies = await prisma.comment.findMany({
    where: { replyId },
  });

  for (const reply of replies) {
    reply.replies = await loadReplies(reply.commentId); // Recursively load nested replies
  }

  return replies;
}

app.post("/comment", authenticate, async (req, res) => {
  try {
    const { ideaId, email, replyId, comment } = req.body;

    const user = await prisma.member.findFirst({
      where: { email: email },
    });

    if (ideaId != "") {
      const response = await prisma.comment.create({
        data: {
          ideaId,
          memberId: user.memberId,
          replyId,
          comment,
        },
      });
      return res.json(response);
    }

    res.json("");
  } catch (error) {
    res.status(500).json({ error: "Failed to comment" });
  }
});

app.post("/vote", authenticate, async (req, res) => {
  try {
    const { ideaId, email } = req.body;

    const user = await prisma.member.findFirst({
      where: { email: email },
    });

    if (ideaId != "") {
      const isExist = await prisma.vote.findFirst({
        where: { ideaId, memberId: user.memberId },
      });
      if (isExist) return res.status(400).json({ error: "Already voted" });

      const response = await prisma.vote.create({
        data: {
          ideaId,
          memberId: user.memberId,
        },
      });
      return res.json(response);
    }

    res.json("");
  } catch (error) {
    res.status(500).json({ error: "Failed to vote" });
  }
});

/** Project  */
app.post("/approve-project", authenticate, async (req, res) => {
  try {
    const { ideaId, projectName } = req.body;
    const response = await prisma.idea.update({
      where: { ideaId: ideaId },
      data: { status: "Done" },
    });

    const createProject = await prisma.project.create({
      data: {
        ideaId,
        projectName,
      },
    });

    return res.json(response);
  } catch (error) {
    return res.status(500).json({ error: "Failed to approve project" });
  }
});

app.get("/load-project", authenticate, async (req, res) => {
  try {
    const response = await prisma.project.findMany();
    return res.json(response);
  } catch (error) {
    return res.status(500).json({ error: "Failed to load project" });
  }
});

app.post("/create-step", authenticate, async (req, res) => {
  try {
    const { project, office, title } = req.body;

    const contribute = await prisma.contributeProject.findFirst({
      where: { projectId: project, officeId: office },
    });
    if (contribute != null && contribute.projectId === project) {
      const response = await prisma.projectStep.create({
        data: {
          title,
          contributeId: contribute.contributeId,
          reportUrl: "",
          comment: "",
        },
      });
      return res.json(response);
    } else {
      const contribute = await prisma.contributeProject.create({
        data: { projectId: project, officeId: office },
      });
      if (contribute != null && contribute.contributeId != null) {
        const response = await prisma.projectStep.create({
          data: {
            title,
            contributeId: contribute.contributeId,
            reportUrl: "",
            comment: "",
          },
        });
        return res.json(response);
      }
    }
  } catch (err) {
    return res.status(500).json({ error: "Failed to create steps" + err });
  }
});

app.get("/load-project-steps", authenticate, async (req, res) => {
  try {
    const projects = [];
    const contributes = await prisma.contributeProject.findMany();
    for (const contribute of contributes) {
      const project = await prisma.project.findFirst({
        where: { projectId: contribute.projectId },
      });
      const response = await prisma.projectStep.findMany({
        where: { contributeId: contribute.contributeId },
      });
      const projectObj = { project: project, steps: response };
      projects.push(projectObj);
    }

    return res.json(projects);
  } catch (error) {
    return res.status(500).json({ error: "Failed to load project" });
  }
});

// Staff

app.post("/register-staff", async (req, res) => {
  const { email, firstName, lastName, roleId, manager } = req.body;
  const hashedPassword = await bcrypt.hash("1234", 10);
  try {
    const mgr = await prisma.member.findFirst({ where: { email: manager } });
    const office = await prisma.office.findFirst({
      where: { managerId: mgr.memberId },
    });

    const member = await prisma.member.create({
      data: { email, firstName, lastName, officeId: office.officeId },
    });
    const user = await prisma.login.create({
      data: { email, password: hashedPassword, roleId },
    });
    
    sendRegisterMail(email);

    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: `User registration failed ${error}` });
  }
});

app.get("/list-staff", authenticate, async (req, res) => {
  try {
    const user_email = req.query["email"];
    const mgr = await prisma.member.findFirst({
      where: {email:user_email}
    });

    const ofz = await prisma.office.findFirst({
      where: {managerId:mgr.memberId}
    });

    const staff = await prisma.member.findMany({
      where: { officeId: ofz.officeId },
    });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch staff" });
  }
});

app.get("/load-project-by-manager", authenticate, async (req, res) => {
  try {
    const projectList = [];
    const user_email = req.query["email"];
    const member = await prisma.member.findFirst({
      where: { email: user_email },
    });
    const office = await prisma.office.findFirst({
      where: { managerId: member.memberId },
    });
    const contributes = await prisma.contributeProject.findMany({
      where: { officeId: office.officeId },
    });

    for (const prj of contributes) {
      const project = await prisma.project.findFirst({
        where: { projectId: prj.projectId },
      });
      projectList.push(project);
    }
    return res.json(projectList);
  } catch (error) {
    return res.status(500).json({ error: "Failed to load project" });
  }
});

app.get("/assign-staff", authenticate, async (req, res) => {
  try {
    const staffList = [];
    const user_email = req.query["email"];
    const member = await prisma.member.findFirst({
      where: { email: user_email },
    });
    const office = await prisma.office.findFirst({
      where: { managerId: member.memberId },
    });

    const assignStaff = await prisma.assignStaff.findMany({where:{officeId:office.officeId}});

    for(const meber of assignStaff){
      const staff = await prisma.member.findFirst({where:{memberId: meber.memberId}});
      const contributes = await prisma.contributeProject.findFirst({
        where: { contributeId: meber.contributeId },
      });
      const project = await prisma.project.findFirst({where: {projectId:contributes.projectId}});

      const response = {staff: staff,project: project}

      staffList.push(response);
    }
    
    return res.json(staffList);
  } catch (error) {
    console.log(error)
    return res.status(500).json({ error: "Failed to load assign staff" });
  }
});

app.post("/assign-staff", authenticate, async (req, res) => {
  try {
    const { selectedStaff, selectedProject, mgrEmail } = req.body;
    const mgr = await prisma.member.findFirst({
      where: { email: mgrEmail },
    });
    const office = await prisma.office.findFirst({
      where: { managerId: mgr.memberId },
    });

    const contributes = await prisma.contributeProject.findFirst({
      where: { projectId: selectedProject, officeId: office.officeId }
    });

    const isExist = await prisma.assignStaff.findFirst({where:{
      contributeId: contributes.contributeId, memberId: selectedStaff
    }});
    if(isExist != null && isExist.assignId != null){
      return res.status(500).json({ error: "Already assign staff" });
    }

    const response = await prisma.assignStaff.create({data:{
      contributeId: contributes.contributeId, officeId: office.officeId, memberId: selectedStaff
    }});
    return res.json(response);
} catch (error) {
  console.log(error)
  return res.status(500).json({ error: "Failed to load assign staff" });
}
});




function sendRegisterMail(email){
  const mailOptions = {
    from: process.env.SMTP_MAIL,
    to: email,
    subject: 'Initial password',
    text: `Hello, this is a initial password email sent using Idea bank. Password is 1234`
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        return console.log('Error sending email: ', error);
    }
    console.log('Email sent: ', info.response);
  });
}



app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
