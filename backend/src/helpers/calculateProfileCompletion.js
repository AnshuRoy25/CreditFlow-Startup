
const calculateAndSaveCompletion = async (userId) => {
  const user = await User.findById(userId);

  let percentage = 0;

  if (user.name)            percentage += 15;
  if (user.dob)             percentage += 15;
  if (user.gender)          percentage += 10;
  if (user.address)         percentage += 15;
  if (user.panVerified)     percentage += 20;
  if (user.aadhaarVerified) percentage += 20;
  if (user.email)           percentage += 5;

  await User.findByIdAndUpdate(userId, { profileCompletionPercentage: percentage });

  return percentage;
};

export default calculateAndSaveCompletion;