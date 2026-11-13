import { permanentRedirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";

// The studio's spring controls now live in the playground's Motion panel.
const StudioPage = () => permanentRedirect(ROUTES.PLAYGROUND);

export default StudioPage;
