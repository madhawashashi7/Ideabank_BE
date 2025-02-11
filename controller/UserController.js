export const signupController = async (req, res, next) => {
  const { email, password } = req.body;
  const user = await prisma.login.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ userId: user.loginId, roleId: user.roleId }, SECRET_KEY, { expiresIn: '1h' });
  res.json({ token });
};
